export type NotaEntradaItem = {
  idNota: string;
  numero: string;
  data: string;
  dataISO: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

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
};

export function formataMoeda(v: number): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formataData(iso: string): string {
  if (!iso) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
    const [y, m, d] = iso.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return iso;
}

import type {
  ProdutoAgrupado,
  EntradaCusto,
} from "./processaCustos";

export function adaptaPlanilhaParaRelatorio(
  agrupados: ProdutoAgrupado[],
  saidasPorSku?: Record<string, { total: number; numPedidos: number }>
): ProdutoRelatorio[] {
  return agrupados.map((g) => {
    const chave = g.sku.trim().toLowerCase();
    const saida = saidasPorSku?.[chave];
    const notas: NotaEntradaItem[] = g.entradas
      .slice()
      .sort((a: EntradaCusto, b: EntradaCusto) =>
        a.dataISO.localeCompare(b.dataISO)
      )
      .map((e: EntradaCusto) => ({
        idNota: e.nf,
        numero: e.nf,
        data: e.data,
        dataISO: e.dataISO,
        quantidade: e.quantidade,
        precoUnitario: e.precoUnitario,
        valorTotal: e.valorTotal,
      }));
    return {
      sku: g.sku,
      produto: g.produto,
      quantidadeTotal: g.quantidadeTotal,
      valorTotalGeral: g.valorTotalGeral,
      custoMedio: g.custoMedio,
      ultimoPreco: g.ultimoPreco,
      ultimaData: g.ultimaData,
      saidasNoPeriodo: saida?.total ?? 0,
      numPedidosVenda: saida?.numPedidos ?? 0,
      notas,
    };
  });
}
