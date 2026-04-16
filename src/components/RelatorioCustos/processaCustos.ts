export type EntradaCusto = {
  sku: string;
  produto: string;
  nf: string;
  data: string; // DD/MM/YYYY
  dataISO: string; // YYYY-MM-DD para comparação
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
};

export type ProdutoAgrupado = {
  sku: string;
  produto: string;
  entradas: EntradaCusto[];
  quantidadeTotal: number;
  valorTotalGeral: number;
  custoMedio: number;
  ultimoPreco: number;
  ultimaData: string;
};

export type ResumoGeral = {
  totalProdutos: number;
  totalEntradas: number;
  valorTotalCompras: number;
  quantidadeTotalItens: number;
  periodoInicio: string;
  periodoFim: string;
};

// Converte "DD/MM/YYYY" → "YYYY-MM-DD"
function toISO(data: string): string {
  const [d, m, y] = data.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parseLinhasXls(
  rows: (string | number)[][]
): EntradaCusto[] {
  // Pula header (row 0)
  return rows.slice(1).reduce<EntradaCusto[]>((acc, row) => {
    if (!row || row.length < 7) return acc;
    const sku = String(row[0] ?? "").trim();
    const produto = String(row[1] ?? "").trim();
    const nf = String(row[2] ?? "").trim();
    const data = String(row[3] ?? "").trim();
    const quantidade = Number(row[4]) || 0;
    const precoUnitario = Number(row[5]) || 0;
    const valorTotal = Number(row[6]) || 0;

    if (!sku || !produto || !data) return acc;

    acc.push({
      sku,
      produto,
      nf,
      data,
      dataISO: toISO(data),
      quantidade,
      precoUnitario,
      valorTotal,
    });
    return acc;
  }, []);
}

export function filtraPorData(
  entradas: EntradaCusto[],
  dataInicio: string,
  dataFim: string
): EntradaCusto[] {
  return entradas.filter((e) => {
    if (dataInicio && e.dataISO < dataInicio) return false;
    if (dataFim && e.dataISO > dataFim) return false;
    return true;
  });
}

export function agrupaPorProduto(entradas: EntradaCusto[]): ProdutoAgrupado[] {
  const mapa = new Map<string, ProdutoAgrupado>();

  for (const entrada of entradas) {
    if (!mapa.has(entrada.sku)) {
      mapa.set(entrada.sku, {
        sku: entrada.sku,
        produto: entrada.produto,
        entradas: [],
        quantidadeTotal: 0,
        valorTotalGeral: 0,
        custoMedio: 0,
        ultimoPreco: 0,
        ultimaData: "",
      });
    }

    const grupo = mapa.get(entrada.sku)!;
    grupo.entradas.push(entrada);
    grupo.quantidadeTotal += entrada.quantidade;
    grupo.valorTotalGeral += entrada.valorTotal;

    // Custo médio ponderado: Σ(preço × qty) / Σqty
    grupo.custoMedio = grupo.valorTotalGeral / grupo.quantidadeTotal;

    // Último preço = entrada mais recente
    if (!grupo.ultimaData || entrada.dataISO > grupo.ultimaData) {
      grupo.ultimaData = entrada.dataISO;
      grupo.ultimoPreco = entrada.precoUnitario;
    }
  }

  return Array.from(mapa.values()).sort((a, b) =>
    a.produto.localeCompare(b.produto)
  );
}

export function calculaResumo(
  entradas: EntradaCusto[],
  agrupados: ProdutoAgrupado[]
): ResumoGeral {
  const datas = entradas.map((e) => e.dataISO).filter(Boolean).sort();
  return {
    totalProdutos: agrupados.length,
    totalEntradas: entradas.length,
    valorTotalCompras: entradas.reduce((s, e) => s + e.valorTotal, 0),
    quantidadeTotalItens: entradas.reduce((s, e) => s + e.quantidade, 0),
    periodoInicio: datas[0] ?? "",
    periodoFim: datas[datas.length - 1] ?? "",
  };
}

export function formataMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formataData(dataISO: string): string {
  if (!dataISO) return "-";
  const [y, m, d] = dataISO.split("-");
  return `${d}/${m}/${y}`;
}
