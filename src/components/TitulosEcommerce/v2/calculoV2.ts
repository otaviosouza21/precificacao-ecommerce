import type { ComposicaoRenda } from "@/lib/financeiro";
import { regraPorValor, type RegraComissao } from "../functions/formataDados";

// Cálculo de taxas da v2 — POR ITEM, direto da composição da Shopee.
//
// Regras (confirmadas com dados reais da Shopee):
//  - Base do pedido = order_discounted_price (= preço original − desconto do
//    vendedor). Somamos por item: original_price − seller_discount de cada um.
//    NÃO usa order_selling_price (que já embute vouchers/coins da Shopee).
//  - A faixa de comissão é definida pelo preço UNITÁRIO do item.
//  - A comissão % incide sobre a base da linha; a taxa FIXA é cobrada por
//    UNIDADE (× quantidade), não uma vez por pedido.
//  - Comissão de afiliados (order_ams_commission_fee) é dedução extra.

// Detalhamento das taxas para exibição no tooltip.
export interface DetalheTaxasV2 {
  base: number;
  // % de comissão (null quando o pedido tem itens em faixas diferentes).
  comissaoPerc: number | null;
  comissaoValor: number;
  // Taxa fixa por unidade (null quando itens têm fixas diferentes).
  taxaFixaUnitaria: number | null;
  // Nº de unidades que pagaram a taxa fixa (o "× N").
  quantidade: number;
  itens: number;
  taxaFixaTotal: number;
  // Afiliados: comissão (order_ams_commission_fee) + taxa de serviço de
  // afiliados (fee_amount de "Taxa de Serviço Afiliados do Vendedor").
  afiliadosComissao: number;
  afiliadosServico: number;
  afiliados: number; // total (comissão + serviço)
  taxaTotal: number;
  liquido: number;
}

export interface ResultadoCalculoV2 {
  base: number; // preço base (order_discounted_price)
  taxa: number; // taxa total (comissão + fixa×qtd + afiliados)
  liquido: number; // base − taxa
  afiliados: number; // comissão de afiliados (valor positivo da dedução)
  regra: RegraComissao; // regra representativa (para exibição)
  houveArredondamento: boolean;
  detalhe: DetalheTaxasV2;
}

const num = (x: unknown): number =>
  typeof x === "number" && Number.isFinite(x) ? x : 0;

// Soma o fee_amount das entradas de afiliados ("Taxa de Serviço Afiliados do
// Vendedor") nas listas de taxas da composição. Essa taxa NÃO está no
// order_ams_commission_fee e precisa ser somada à dedução de afiliados.
function taxaServicoAfiliados(comp: ComposicaoRenda | undefined): number {
  if (!comp) return 0;
  const listas = [
    comp.net_service_fee_info_list,
    comp.net_commission_fee_info_list,
  ];
  let soma = 0;
  for (const lista of listas) {
    if (!Array.isArray(lista)) continue;
    for (const e of lista) {
      if (e && /afiliad/i.test(String(e.rule_display_name ?? ""))) {
        soma += num(e.fee_amount);
      }
    }
  }
  return +soma.toFixed(2);
}

export function calculaLiquidoV2(
  comp: ComposicaoRenda | undefined,
  valorRecebido: number,
  valorTituloFallback: number,
): ResultadoCalculoV2 {
  let base = 0;
  let comissaoValor = 0;
  let taxaFixaTotal = 0;
  let quantidade = 0;
  let itens = 0;
  let regraRepresentativa: RegraComissao | null = null;
  const percs = new Set<number>();
  const fixas = new Set<number>();

  const listaItens = Array.isArray(comp?.items) ? comp!.items : [];
  for (const it of listaItens) {
    if (typeof it.original_price !== "number") continue;
    const qtd =
      typeof it.quantity_purchased === "number" && it.quantity_purchased > 0
        ? it.quantity_purchased
        : 1;
    // Base da linha = preço original − desconto do vendedor (efetivo do lojista).
    const baseLinha = +(it.original_price - num(it.seller_discount)).toFixed(2);
    const precoUnitario = baseLinha / qtd;
    const regra = regraPorValor(precoUnitario);

    comissaoValor += baseLinha * regra.perc_comissao_shopee;
    taxaFixaTotal += regra.taxa_fixa_shopee * qtd;
    base += baseLinha;
    quantidade += qtd;
    itens += 1;
    percs.add(regra.perc_comissao_shopee);
    fixas.add(regra.taxa_fixa_shopee);
    if (!regraRepresentativa) regraRepresentativa = regra;
  }

  // Fallback quando a composição não traz itens: usa o total do pedido.
  if (base === 0) {
    base =
      num(comp?.order_discounted_price) ||
      num(comp?.order_selling_price) ||
      valorTituloFallback;
    const regra = regraPorValor(base);
    comissaoValor = base * regra.perc_comissao_shopee;
    taxaFixaTotal = regra.taxa_fixa_shopee;
    quantidade = 1;
    itens = 1;
    percs.add(regra.perc_comissao_shopee);
    fixas.add(regra.taxa_fixa_shopee);
    regraRepresentativa = regra;
  }

  const afiliadosComissao = Math.abs(num(comp?.order_ams_commission_fee));
  const afiliadosServico = taxaServicoAfiliados(comp);
  const afiliados = +(afiliadosComissao + afiliadosServico).toFixed(2);
  base = +base.toFixed(2);
  comissaoValor = +comissaoValor.toFixed(2);
  taxaFixaTotal = +taxaFixaTotal.toFixed(2);
  let taxa = +(comissaoValor + taxaFixaTotal + afiliados).toFixed(2);
  let liquido = +(base - taxa).toFixed(2);

  // Mesma tolerância de arredondamento de 1 centavo da v1.
  let houveArredondamento = false;
  if (+(valorRecebido - liquido).toFixed(2) === -0.01) {
    liquido = +(liquido - 0.01).toFixed(2);
    taxa = +(taxa + 0.01).toFixed(2);
    houveArredondamento = true;
  }

  return {
    base,
    taxa,
    liquido,
    afiliados,
    regra: regraRepresentativa ?? regraPorValor(base),
    houveArredondamento,
    detalhe: {
      base,
      comissaoPerc: percs.size === 1 ? [...percs][0] : null,
      comissaoValor,
      taxaFixaUnitaria: fixas.size === 1 ? [...fixas][0] : null,
      quantidade,
      itens,
      taxaFixaTotal,
      afiliadosComissao,
      afiliadosServico,
      afiliados,
      taxaTotal: taxa,
      liquido,
    },
  };
}
