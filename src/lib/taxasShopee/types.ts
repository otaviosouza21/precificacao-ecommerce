// Faixa de comissão de marketplace, escolhida pelo preço unitário do item.
// Também é o formato usado pelas faixas da calculadora de precificação.
export type FaixaComissao = {
  id: string;
  precoMin: number;
  precoMax: number | null; // null = sem limite superior
  comissaoPct: number; // 14 = 14%
  taxaFixa: number; // R$ por unidade
};

// Resposta de GET/PUT /taxas-shopee.
export interface TaxasShopee {
  faixas: FaixaComissao[];
  atualizadoEm: string | null;
  atualizadoPor: string | null;
  padrao: boolean; // true = nada salvo ainda; faixas = tabela padrão
}
