export type ProdutoApi = {
  produto: {
    id: string;
    nome: string;
    data_criacao: string;
    codigo: string;
    preco: number;
    preco_promocional: number;
    unidade: string;
    gtin: string;
    tipoVariacao: string;
    localizacao: string;
    preco_custo: number;
    preco_custo_medio: number;
    situacao: string;
  };
};

export type ProdutosListApi = {
  retorno: {
    status: string;
    pagina: number;
    numero_paginas: number;
    produtos: ProdutoApi[];
  };
};

export type TitulosAReceberListApi = {
  retorno: {
    status: string;
    pagina: number;
    numero_paginas: number;
    contas: TitulosReceberApiTiny[];
  };
};

export type TitulosReceberApiTiny = {
  conta: {
    id: string;
    nome_cliente: string;
    valor: string;
    data_emissao: string;
    historico: string;
    numero_doc: string;
  };
};

export type ProdutoTiny = {
  id: string;
  nome: string;
  codigo: string;
  unidade: string;
  preco: number;
  preco_promocional: number;
  ncm: string;
  origem: string;
  gtin: string;
  gtin_embalagem: string;
  localizacao: string;
  peso_liquido: number;
  peso_bruto: number;
  estoque_minimo: number;
  estoque_maximo: number;
  id_fornecedor: number;
  nome_fornecedor: string;
  codigo_fornecedor: string;
  codigo_pelo_fornecedor: string;
  unidade_por_caixa: string;
  preco_custo: number;
  preco_custo_medio: number;
  situacao: string;
  tipo: string;
  tipoEmbalagem: string;
  alturaEmbalagem: string;
  comprimentoEmbalagem: string;
  larguraEmbalagem: string;
  diametroEmbalagem: string;
};
