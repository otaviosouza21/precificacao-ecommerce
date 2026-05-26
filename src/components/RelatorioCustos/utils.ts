import type {
  NotaEntradaItem,
  ProdutoRelatorio,
} from "./types";
import type {
  EntradaCusto,
  ProdutoAgrupado,
} from "./processaCustos";

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

export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function diasAtrasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

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
