import type { RegraComissao } from "../functions/formataDados";

// O cálculo das taxas da v2 é feito pela API da Bikeline
// (POST /conciliacao/shopee/calcular — bkl-api src/conciliacao/
// conciliacao-shopee.calculo.ts), a mesma função usada pela rotina automática
// de conciliação. Aqui ficam só os tipos do resultado.
//
// Regras (resumo): base = preço de referência do nosso banco por item
// (fallback: vendido na Shopee); faixa pelo preço unitário (tabela "Taxas
// Shopee"); taxa fixa por unidade; afiliados como dedução extra; tolerância de
// −0,01 e arredondamento da Shopee de até +0,02.

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
  arredondamentoShopee: number;
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
  arredondamentoShopee: number; // quanto a Shopee pagou a mais (0 a 0,02)
  detalhe: DetalheTaxasV2;
}
