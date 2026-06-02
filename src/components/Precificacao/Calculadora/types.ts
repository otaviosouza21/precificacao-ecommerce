export type FaixaComissao = {
  id: string;
  precoMin: number;
  precoMax: number | null;
  comissaoPct: number;
  taxaFixa: number;
};

export type Marketplace = {
  id: string;
  nome: string;
  faixas: FaixaComissao[];
};

export type ParametrosCalculadora = {
  margemDesejadaPct: number;
  embalagem: number;
  marketplaces: Marketplace[];
};

export type ProdutoCalculadora = {
  id: string;
  sku: string;
  nome: string;
  custo: number;
};

export type PrecoMinimoPorFaixa = {
  faixa: FaixaComissao;
  precoMinimo: number;
  aplicavel: boolean;
};

export type ResultadoMinimo = {
  custoMargemBase: number;
  porFaixa: PrecoMinimoPorFaixa[];
  faixaAplicavel: FaixaComissao | null;
  precoMinimoRecomendado: number | null;
};

export type ResultadoValidacao = {
  faixa: FaixaComissao | null;
  comissaoPct: number;
  taxaFixa: number;
  embalagem: number;
  valorLiquido: number;
  custo: number;
  lucro: number;
  margemSobreCusto: number;
  atendeMargemMinima: boolean;
};
