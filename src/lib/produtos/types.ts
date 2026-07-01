// Tipos da API de Produtos da Bikeline (dados do Tiny ERP).
// Ver: produtos-api.md (GET /produtos)

export type SituacaoProduto = "A" | "I" | "E";

// Preço de um produto em UMA tabela de preço específica.
export type PrecoEmTabela = {
  idTabela: number;
  tabela: string;
  acrescimoDesconto: number | null;
  preco: number | null;
  precoPromocional: number | null;
};

// Um produto com o preço base e o preço em cada tabela.
export type Produto = {
  id: number;
  sku: string;
  descricao: string;
  situacao: SituacaoProduto | string;
  unidade: string;
  gtin: string;
  precoNormal: number | null;
  precoPromocional: number | null;
  precoCusto: number | null;
  tabelas: PrecoEmTabela[];
};

// Catálogo geral das tabelas de preço (útil para montar filtros/seletor).
export type TabelaPreco = {
  id: number;
  descricao: string;
  acrescimoDesconto: number;
};

export type Paginacao = {
  limit: number;
  offset: number;
  total: number;
};

export type ListarProdutosResponse = {
  produtos: Produto[];
  tabelasPreco: TabelaPreco[];
  paginacao: Paginacao;
};

// Parâmetros de query da rota GET /produtos (todos opcionais).
export type ListarProdutosParams = {
  nome?: string;
  codigo?: string;
  gtin?: string;
  situacao?: SituacaoProduto;
  idListaPreco?: number;
  // Se informado, retorna só essa página (desliga o "traz tudo").
  limit?: number; // 1..100
  offset?: number; // >= 0
};
