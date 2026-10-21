import type { FaixaComissao } from "./types";

// Tabela padrão da Shopee. A vigente fica no banco (tela "Taxas Shopee"); esta
// só é usada quando a API não responde e para "Restaurar padrão".
export const TAXAS_SHOPEE_PADRAO: FaixaComissao[] = [
  { id: "shopee-1", precoMin: 0, precoMax: 79.99, comissaoPct: 20, taxaFixa: 4 },
  { id: "shopee-2", precoMin: 80, precoMax: 99.99, comissaoPct: 14, taxaFixa: 16 },
  { id: "shopee-3", precoMin: 100, precoMax: 199.99, comissaoPct: 14, taxaFixa: 20 },
  { id: "shopee-4", precoMin: 200, precoMax: 499.99, comissaoPct: 14, taxaFixa: 26 },
  { id: "shopee-5", precoMin: 500, precoMax: null, comissaoPct: 14, taxaFixa: 26 },
];
