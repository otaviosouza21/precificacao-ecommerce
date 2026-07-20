import type { ComposicaoRenda } from "@/lib/financeiro";
import { regraPorValor, type RegraComissao } from "../functions/formataDados";

// Cálculo de taxas da v2 — POR ITEM.
//
// Base do cálculo = PREÇO DE REFERÊNCIA do nosso banco (anúncio Shopee),
// somado por item (preço unitário × quantidade). Quando o SKU não tem
// referência cadastrada, cai no preço vendido da Shopee
// (order_discounted_price da composição).
//
// Sobre a base:
//  - a faixa de comissão é definida pelo preço UNITÁRIO;
//  - a comissão % incide sobre a base da linha;
//  - a taxa FIXA é cobrada por UNIDADE (× quantidade);
//  - comissão de afiliados (order_ams_commission_fee + "Taxa de Serviço
//    Afiliados do Vendedor") é dedução extra.

// Detalhamento das taxas para exibição no tooltip.
export interface DetalheTaxasV2 {
  base: number;
  comissaoPerc: number | null;
  comissaoValor: number;
  taxaFixaUnitaria: number | null;
  quantidade: number;
  itens: number;
  taxaFixaTotal: number;
  afiliadosComissao: number;
  afiliadosServico: number;
  afiliados: number;
  taxaTotal: number;
  liquido: number;
}

export interface ResultadoCalculoV2 {
  base: number; // base usada (referência do banco; ou Shopee no fallback)
  baseShopee: number; // preço vendido na Shopee (order_discounted_price)
  usouReferencia: boolean; // true quando todos os itens usaram a referência
  taxa: number;
  liquido: number;
  afiliados: number;
  regra: RegraComissao;
  houveArredondamento: boolean;
  detalhe: DetalheTaxasV2;
}

const num = (x: unknown): number =>
  typeof x === "number" && Number.isFinite(x) ? x : 0;

// Soma o fee_amount das entradas de afiliados ("Taxa de Serviço Afiliados do
// Vendedor") nas listas de taxas da composição.
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
  precosRef: Map<string, number>,
): ResultadoCalculoV2 {
  let base = 0;
  let baseShopee = 0;
  let comissaoValor = 0;
  let taxaFixaTotal = 0;
  let quantidade = 0;
  let itens = 0;
  let usouFallback = false;
  let regraRepresentativa: RegraComissao | null = null;
  const percs = new Set<number>();
  const fixas = new Set<number>();

  const listaItens = Array.isArray(comp?.items) ? comp!.items : [];
  for (const it of listaItens) {
    const qtd =
      typeof it.quantity_purchased === "number" && it.quantity_purchased > 0
        ? it.quantity_purchased
        : 1;

    // Referência do nosso banco (preço por unidade) casada por SKU/variação.
    const sku = String(it.model_sku || it.item_sku || "")
      .trim()
      .toUpperCase();
    const refUnit = sku ? precosRef.get(sku) : undefined;

    // Preço vendido na Shopee da linha (original − desconto do vendedor).
    const shopeeLinha =
      typeof it.original_price === "number"
        ? +(it.original_price - num(it.seller_discount)).toFixed(2)
        : null;

    let baseLinha: number;
    let precoUnitario: number;
    if (refUnit != null && Number.isFinite(refUnit)) {
      baseLinha = +(refUnit * qtd).toFixed(2);
      precoUnitario = refUnit;
    } else if (shopeeLinha != null) {
      baseLinha = shopeeLinha;
      precoUnitario = shopeeLinha / qtd;
      usouFallback = true;
    } else {
      continue;
    }

    const regra = regraPorValor(precoUnitario);
    comissaoValor += baseLinha * regra.perc_comissao_shopee;
    taxaFixaTotal += regra.taxa_fixa_shopee * qtd;
    base += baseLinha;
    if (shopeeLinha != null) baseShopee += shopeeLinha;
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
    baseShopee = base;
    usouFallback = true;
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
  baseShopee = +baseShopee.toFixed(2);
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
    baseShopee,
    usouReferencia: !usouFallback && itens > 0,
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
