"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Download,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";

import { useAuth } from "@/contexts/AuthContext";
import {
  listarVendasCustos,
  RelatoriosApiError,
  sincronizarCustos,
  sincronizarVendas,
  statusRelatorios,
  type CampoOrdenacao,
  type LinhaVendaCusto,
  type RelatorioVendasCustos,
  type StatusRelatorios,
} from "@/lib/relatorios";
import FiltroPeriodo from "@/components/Ui/FiltroPeriodo";

// Data local (não UTC) no formato YYYY-MM-DD, para os inputs type="date".
function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

const brl = (v: number | null | undefined) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const pct = (v: number | null) =>
  v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} %`;

function formataDataHora(iso: string | null): string {
  if (!iso) return "nunca";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

/** Considera a sincronização defasada depois de 12 horas. */
function estaDefasado(iso: string | null): boolean {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t > 12 * 60 * 60 * 1000;
}

/** Colunas da tabela, na mesma ordem do relatório do Tiny. */
const COLUNAS: {
  campo: CampoOrdenacao;
  rotulo: string;
  alinhamento: "left" | "right";
}[] = [
  { campo: "produto", rotulo: "Produto", alinhamento: "left" },
  { campo: "sku", rotulo: "Código (SKU)", alinhamento: "left" },
  { campo: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
  { campo: "valor", rotulo: "Valor", alinhamento: "right" },
  { campo: "frete", rotulo: "Frete", alinhamento: "right" },
  { campo: "custo", rotulo: "Custo", alinhamento: "right" },
  { campo: "lucro", rotulo: "Valor Lucro", alinhamento: "right" },
  { campo: "lucroPercentual", rotulo: "% Lucro", alinhamento: "right" },
  { campo: "total", rotulo: "Total", alinhamento: "right" },
];

export default function RelatorioVendas() {
  const { token } = useAuth();

  const [de, setDe] = useState(() =>
    isoLocal(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
  );
  const [ate, setAte] = useState(() => isoLocal(new Date()));
  const [custoNoPeriodo, setCustoNoPeriodo] = useState(false);

  const [relatorio, setRelatorio] = useState<RelatorioVendasCustos | null>(null);
  const [status, setStatus] = useState<StatusRelatorios | null>(null);
  const [busca, setBusca] = useState("");

  const [ordenarPor, setOrdenarPor] = useState<CampoOrdenacao>("valor");
  const [direcao, setDirecao] = useState<"asc" | "desc">("desc");

  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState<null | "vendas" | "custos">(
    null,
  );
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregarStatus = useCallback(async () => {
    if (!token) return;
    try {
      setStatus(await statusRelatorios(token));
    } catch {
      // O status é informativo: uma falha aqui não impede o relatório.
    }
  }, [token]);

  useEffect(() => {
    carregarStatus();
  }, [carregarStatus]);

  async function buscar() {
    if (!token) {
      setErro("Não autenticado — refaça o login.");
      return;
    }

    setCarregando(true);
    setErro(null);
    setAviso(null);

    try {
      const resposta = await listarVendasCustos(token, {
        de,
        ate,
        custoNoPeriodo: custoNoPeriodo || undefined,
      });
      setRelatorio(resposta);

      if (resposta.itens.length === 0) {
        setAviso(
          "Nenhuma venda encontrada no período. Se as vendas são recentes, sincronize os pedidos da Shopee.",
        );
      } else if (resposta.meta.skusSemCusto > 0) {
        setAviso(
          `${resposta.meta.skusSemCusto} de ${resposta.meta.skus} SKUs estão sem custo cadastrado no Tiny — ` +
            "essas linhas aparecem com custo e lucro zerados. Sincronize os custos do Tiny.",
        );
      }
    } catch (err) {
      console.error("Erro ao gerar o relatório de vendas x custo:", err);
      setRelatorio(null);
      setErro(
        err instanceof RelatoriosApiError
          ? err.message
          : "Erro ao gerar o relatório.",
      );
    } finally {
      setCarregando(false);
    }
  }

  async function sincronizar(alvo: "vendas" | "custos") {
    if (!token) {
      setErro("Não autenticado — refaça o login.");
      return;
    }

    setSincronizando(alvo);
    setErro(null);

    try {
      if (alvo === "vendas") {
        const r = await sincronizarVendas(token, { de, ate });
        toast.success(
          `${r.pedidos} pedidos e ${r.itens} itens sincronizados da Shopee.`,
        );
      } else {
        const r = await sincronizarCustos(token);
        toast.success(`${r.total} SKUs com custo atualizados do Tiny.`);
      }
      await carregarStatus();
      await buscar();
    } catch (err) {
      console.error(`Erro ao sincronizar ${alvo}:`, err);
      const mensagem =
        err instanceof RelatoriosApiError
          ? err.message
          : `Erro ao sincronizar ${alvo}.`;
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setSincronizando(null);
    }
  }

  const linhas = useMemo(() => {
    const itens = relatorio?.itens ?? [];
    const q = busca.trim().toLowerCase();
    const filtrados = q
      ? itens.filter(
          (i) =>
            i.sku.toLowerCase().includes(q) ||
            i.produto.toLowerCase().includes(q),
        )
      : itens;

    const sinal = direcao === "desc" ? -1 : 1;
    return [...filtrados].sort((a, b) => {
      if (ordenarPor === "produto" || ordenarPor === "sku") {
        return sinal * a[ordenarPor].localeCompare(b[ordenarPor], "pt-BR");
      }
      return sinal * ((a[ordenarPor] ?? 0) - (b[ordenarPor] ?? 0));
    });
  }, [relatorio, busca, ordenarPor, direcao]);

  // Os totais acompanham o filtro de texto, não só o período.
  const totais = useMemo(() => {
    const soma = linhas.reduce(
      (acc, l) => ({
        quantidade: acc.quantidade + l.quantidade,
        valor: acc.valor + l.valor,
        frete: acc.frete + l.frete,
        custo: acc.custo + l.custo,
      }),
      { quantidade: 0, valor: 0, frete: 0, custo: 0 },
    );
    const lucro = soma.valor - soma.custo;
    return {
      ...soma,
      lucro,
      lucroPercentual: soma.custo > 0 ? (lucro / soma.custo) * 100 : null,
      total: soma.valor + soma.frete,
    };
  }, [linhas]);

  function alternarOrdenacao(campo: CampoOrdenacao) {
    if (campo === ordenarPor) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setOrdenarPor(campo);
      setDirecao(campo === "produto" || campo === "sku" ? "asc" : "desc");
    }
  }

  function exportarXlsx() {
    if (linhas.length === 0) return;

    const dados = linhas.map((l) => ({
      Produto: l.produto,
      "Código (SKU)": l.sku,
      Quantidade: l.quantidade,
      Valor: l.valor,
      Frete: l.frete,
      Custo: l.custo,
      "Custo unitário": l.custoUnitario,
      "Valor Lucro": l.lucro,
      "% Lucro": l.lucroPercentual,
      Total: l.total,
      Pedidos: l.nPedidos,
      "Origem do custo": l.origemCusto,
    }));

    const planilha = XLSX.utils.json_to_sheet(dados);
    const pasta = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(pasta, planilha, "Vendas x Custo");
    XLSX.writeFile(pasta, `vendas-custo_${de}_a_${ate}.xlsx`);
  }

  const vendasDefasadas = estaDefasado(status?.vendas.ultimaSincronizacao ?? null);

  return (
    <div className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800">
          Vendas <span className="text-slate-400">x</span> Custo
        </h1>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-600/20">
          Shopee + Tiny
        </span>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => sincronizar("vendas")}
            disabled={sincronizando !== null}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${sincronizando === "vendas" ? "animate-spin" : ""}`}
            />
            Sincronizar vendas
          </button>

          <button
            type="button"
            onClick={() => sincronizar("custos")}
            disabled={sincronizando !== null}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${sincronizando === "custos" ? "animate-spin" : ""}`}
            />
            Sincronizar custos
          </button>

          <button
            type="button"
            onClick={exportarXlsx}
            disabled={linhas.length === 0}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Quantidade e valor vêm dos pedidos da Shopee; o custo médio vem do Tiny.
        A junção é feita pelo SKU.
      </p>

      <FiltroPeriodo
        de={de}
        ate={ate}
        setDe={setDe}
        setAte={setAte}
        onBuscar={buscar}
        carregando={carregando}
        titulo="Período de venda (data do pedido na Shopee)"
        rotuloBotao="Gerar relatório"
        rotuloCarregando="Gerando..."
        dica="Pedidos cancelados e não pagos ficam de fora. O relatório lê do nosso banco — sincronize as vendas para trazer pedidos novos."
      >
        <label className="flex items-center gap-2 pb-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={custoNoPeriodo}
            onChange={(e) => setCustoNoPeriodo(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
          />
          Custo médio do período
          <span className="text-slate-400">(mais lento)</span>
        </label>
      </FiltroPeriodo>

      {erro && (
        <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {aviso && (
        <div className="mt-2 mb-4 flex items-start gap-2 rounded border border-yellow-400 bg-yellow-100 p-3 text-yellow-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{aviso}</span>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white/70 px-4 py-2 text-xs text-slate-600">
        <span>
          Vendas sincronizadas:{" "}
          <strong className={vendasDefasadas ? "text-amber-700" : ""}>
            {formataDataHora(status?.vendas.ultimaSincronizacao ?? null)}
          </strong>
        </span>
        <span className="text-slate-300">|</span>
        <span>
          Custos do Tiny:{" "}
          <strong>
            {formataDataHora(status?.custos.ultimaSincronizacao ?? null)}
          </strong>{" "}
          ({status?.custos.skus ?? 0} SKUs)
        </span>
        {relatorio && (
          <>
            <span className="text-slate-300">|</span>
            <span>
              {relatorio.meta.skus} SKUs em {relatorio.meta.pedidos} pedidos
            </span>
            {relatorio.meta.custoNoPeriodo && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">
                custo do período
              </span>
            )}
          </>
        )}
      </div>

      {relatorio && relatorio.itens.length > 0 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por SKU ou nome do produto..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </div>
      )}

      {carregando && (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-sky-500"></div>
          <span className="ml-2 text-gray-600">Gerando relatório...</span>
        </div>
      )}

      {!carregando && relatorio && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  {COLUNAS.map((c) => (
                    <th
                      key={c.campo}
                      onClick={() => alternarOrdenacao(c.campo)}
                      className={`cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-sky-700 ${
                        c.alinhamento === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {c.rotulo}
                      {ordenarPor === c.campo && (
                        <span className="ml-1 text-sky-600">
                          {direcao === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {linhas.map((linha) => (
                  <Linha key={linha.sku} linha={linha} />
                ))}
              </tbody>

              {linhas.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-800">
                  <tr>
                    <td className="px-4 py-3 text-sm">Total</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {linhas.length} SKUs
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {totais.quantidade}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {brl(totais.valor)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {brl(totais.frete)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {brl(totais.custo)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm ${
                        totais.lucro < 0 ? "text-red-600" : "text-emerald-700"
                      }`}
                    >
                      {brl(totais.lucro)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {pct(totais.lucroPercentual)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {brl(totais.total)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {relatorio.itens.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-slate-500">
              <Package className="h-8 w-8 text-slate-300" />
              Nenhuma venda no período selecionado.
            </div>
          )}
          {relatorio.itens.length > 0 && linhas.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              Nenhum resultado para “{busca}”.
            </div>
          )}
        </div>
      )}

      {!carregando && !relatorio && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-12 text-center text-sm text-slate-500">
          <Package className="h-8 w-8 text-slate-300" />
          Escolha o período e clique em <strong>Gerar relatório</strong>.
        </div>
      )}
    </div>
  );
}

function Linha({ linha }: { linha: LinhaVendaCusto }) {
  const semCusto = linha.origemCusto === "indisponivel";

  return (
    <tr className="transition-colors hover:bg-indigo-50/50">
      <td className="px-4 py-3 text-sm text-slate-800">
        <div className="flex items-center gap-2">
          <span className="max-w-md truncate" title={linha.produto}>
            {linha.produto}
          </span>
          {semCusto && (
            <span
              className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20"
              title="Sem custo cadastrado no Tiny para este SKU."
            >
              sem custo
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {linha.nPedidos} {linha.nPedidos === 1 ? "pedido" : "pedidos"}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-sm text-slate-600">{linha.sku}</td>
      <td className="px-4 py-3 text-right text-sm text-slate-800">
        {linha.quantidade}
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-800">
        {brl(linha.valor)}
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-500">
        {brl(linha.frete)}
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-800">
        {semCusto ? "—" : brl(linha.custo)}
      </td>
      <td
        className={`px-4 py-3 text-right text-sm font-medium ${
          semCusto
            ? "text-slate-400"
            : linha.lucro < 0
              ? "text-red-600"
              : "text-emerald-700"
        }`}
      >
        {semCusto ? "—" : brl(linha.lucro)}
      </td>
      <td
        className={`px-4 py-3 text-right text-sm ${
          linha.lucroPercentual != null && linha.lucroPercentual < 0
            ? "text-red-600"
            : "text-slate-600"
        }`}
      >
        {pct(linha.lucroPercentual)}
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-800">
        {brl(linha.total)}
      </td>
    </tr>
  );
}
