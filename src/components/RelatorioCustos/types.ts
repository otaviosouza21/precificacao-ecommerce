import type { CmvResultadoOk } from "@/actions/v3/gerarRelatorioCmvV3";
import type { ProgressoSync } from "@/actions/v3/progressoStore";

export type NotaEntradaItem = {
  idNota: string;
  numero: string;
  data: string;
  dataISO: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type ItemVendaSku = {
  idPedido: string;
  numero: string;
  dataISO: string;
  data: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type OrigemCusto = "periodo" | "historico" | "indisponivel";

export type ProdutoRelatorio = {
  sku: string;
  produto: string;
  idProdutoTiny?: string;
  quantidadeTotal: number;
  valorTotalGeral: number;
  custoMedio: number;
  ultimoPreco: number;
  ultimaData: string;
  saidasNoPeriodo: number;
  numPedidosVenda: number;
  notas: NotaEntradaItem[];
  custoUnitario?: number;
  origemCusto?: OrigemCusto;
  receita?: number;
  cmv?: number;
  margemReais?: number;
  margemPercent?: number;
  pedidos?: ItemVendaSku[];
};

export type Fonte = "tiny" | "planilha";

export type EstadoRelatorio =
  | { status: "vazio" }
  | { status: "carregando"; progresso: ProgressoSync | null }
  | { status: "ok"; resultado: CmvResultadoOk }
  | { status: "erro"; mensagem: string; precisaRelogar?: boolean };

export type EstadoVendasPlanilha =
  | { status: "idle" }
  | { status: "carregando" }
  | {
      status: "ok";
      porSku: Record<string, { total: number; numPedidos: number }>;
      totalPedidos: number;
    }
  | { status: "erro"; mensagem: string; rateLimited?: boolean };
