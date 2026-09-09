// Tipos da API de Relatórios da Bikeline.
// Ver: GET /relatorios/vendas-custos, GET /relatorios/status,
// POST /relatorios/vendas/sincronizar e POST /relatorios/custos/sincronizar.

/** De onde veio o custo unitário aplicado à linha. */
export type OrigemCusto = "periodo" | "atual" | "indisponivel";

/** Uma linha do relatório: um SKU dentro do período. */
export interface LinhaVendaCusto {
  sku: string;
  produto: string;
  quantidade: number;
  valor: number;
  frete: number;
  custo: number;
  custoUnitario: number;
  lucro: number;
  /** Markup sobre o custo. `null` quando não há custo cadastrado. */
  lucroPercentual: number | null;
  /** valor + frete */
  total: number;
  nPedidos: number;
  origemCusto: OrigemCusto;
}

export interface TotaisVendaCusto {
  quantidade: number;
  valor: number;
  frete: number;
  custo: number;
  lucro: number;
  lucroPercentual: number | null;
  total: number;
}

export interface RelatorioVendasCustos {
  periodo: { de: string; ate: string };
  /** Última sincronização de pedidos da Shopee (ISO) ou `null`. */
  sincronizadoEm: string | null;
  totais: TotaisVendaCusto;
  meta: {
    skus: number;
    pedidos: number;
    skusSemCusto: number;
    itensSemSku: number;
    custoNoPeriodo: boolean;
  };
  itens: LinhaVendaCusto[];
}

export type CampoOrdenacao =
  | "produto"
  | "sku"
  | "quantidade"
  | "valor"
  | "frete"
  | "custo"
  | "lucro"
  | "lucroPercentual"
  | "total";

export interface ParamsVendasCustos {
  /** YYYY-MM-DD, ISO ou Unix(s). Padrão: 30 dias atrás. */
  de?: string;
  ate?: string;
  /** Busca o custo histórico no Tiny em vez do custo atual. Mais lento. */
  custoNoPeriodo?: boolean;
  busca?: string;
  ordenarPor?: CampoOrdenacao;
  direcao?: "asc" | "desc";
}

export interface StatusRelatorios {
  vendas: { ultimaSincronizacao: string | null };
  custos: { ultimaSincronizacao: string | null; skus: number };
}

export interface ResultadoSyncVendas {
  pedidos: number;
  itens: number;
  periodo: { de: string; ate: string };
  duracaoMs: number;
}

export interface ResultadoSyncCustos {
  total: number;
  ignoradosSemSku: number;
  sincronizadoEm: string;
  duracaoMs: number;
}
