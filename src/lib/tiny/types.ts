export type TinyTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  scope?: string;
  tokenType: "Bearer";
  obtidoEm: number;
};

export type StatusAuth =
  | { connected: false; reason: "no_tokens" | "refresh_expired" }
  | {
      connected: true;
      accessExpiresAt: number;
      refreshExpiresAt: number;
      precisaRelogarEm: number;
    };

export type TinyAuthErrorMotivo =
  | "no_tokens"
  | "refresh_expired"
  | "refresh_failed";

export class TinyAuthError extends Error {
  motivo: TinyAuthErrorMotivo;
  constructor(motivo: TinyAuthErrorMotivo, mensagem?: string) {
    super(mensagem ?? motivo);
    this.name = "TinyAuthError";
    this.motivo = motivo;
  }
}

export type TinyTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  scope?: string;
};

export type V3PageMeta = {
  itens?: unknown[];
  paginacao?: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type V3CustoItem = {
  data?: string | null;
  saldoAtual?: number | null;
  saldoAnterior?: number | null;
  precoCusto?: number | null;
  custoMedio?: number | null;
  precoVenda?: number | null;
  impostosRecuperaveis?: number | null;
};

export type V3CustosResponse = {
  itens?: V3CustoItem[];
  paginacao?: { limit: number; offset: number; total: number };
};

export type V3NotaCabecalho = {
  id?: string | number;
  numero?: string;
  serie?: string;
  tipo?: "E" | "S";
  situacao?: number | string;
  dataEmissao?: string;
  dataInclusao?: string;
  valor?: number;
  valorProdutos?: number;
};

export type V3NotasListResponse = {
  itens?: V3NotaCabecalho[];
  paginacao?: { limit: number; offset: number; total: number };
};

export type V3NotaItem = {
  produto?: {
    id?: string | number;
    sku?: string;
    codigo?: string;
    descricao?: string;
    nome?: string;
  };
  sku?: string;
  codigo?: string;
  descricao?: string;
  quantidade?: number;
  valorUnitario?: number;
  valor?: number;
  valorTotal?: number;
};

export type V3NotaCompleta = V3NotaCabecalho & {
  itens?: V3NotaItem[];
};

export type V3PedidoCabecalho = {
  id?: string | number;
  numero?: string;
  situacao?: number | string;
  dataCriacao?: string;
  dataPrevista?: string;
  valor?: number;
  cliente?: { nome?: string; cpfCnpj?: string };
};

export type V3PedidosListResponse = {
  itens?: V3PedidoCabecalho[];
  paginacao?: { limit: number; offset: number; total: number };
};

export type V3PedidoItem = {
  produto?: {
    id?: string | number;
    sku?: string;
    codigo?: string;
    descricao?: string;
    nome?: string;
  };
  sku?: string;
  codigo?: string;
  descricao?: string;
  quantidade?: number;
  valorUnitario?: number;
};

export type V3PedidoCompleto = V3PedidoCabecalho & {
  itens?: V3PedidoItem[];
};

export type V3ProdutoCabecalho = {
  id?: string | number;
  sku?: string;
  codigo?: string;
  nome?: string;
  descricao?: string;
  situacao?: string;
};

export type V3ProdutosListResponse = {
  itens?: V3ProdutoCabecalho[];
  paginacao?: { limit: number; offset: number; total: number };
};
