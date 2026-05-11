"use client";

import { getProgressoSync } from "@/actions/v3/getProgressoSync";
import {
  getRelatorioProdutosV3,
  RelatorioProdutosOk,
} from "@/actions/v3/getRelatorioProdutosV3";
import { getSaidasProdutosV3 } from "@/actions/v3/getSaidasProdutosV3";
import type { ProgressoSync } from "@/actions/v3/progressoStore";
import { getSaidasPeriodoTiny } from "@/actions/getSaidasPeriodoTiny";
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileSpreadsheet,
  Hash,
  Loader2,
  Package,
  Plug,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import LerPlanilhaCustos from "./LerPlanilhaCustos";
import SeletorProdutos, { ProdutoSelecionado } from "./SeletorProdutos";
import StatusAutenticacaoTiny from "./StatusAutenticacaoTiny";
import {
  EntradaCusto,
  agrupaPorProduto,
  filtraPorData,
} from "./processaCustos";
import {
  adaptaPlanilhaParaRelatorio,
  formataData,
  formataMoeda,
  ProdutoRelatorio,
} from "./tipos";
import type { StatusAuth } from "@/lib/tiny/types";

type Fonte = "tiny" | "planilha";

type EstadoRelatorio =
  | { status: "vazio" }
  | { status: "carregando"; progresso: ProgressoSync | null }
  | { status: "ok"; resultado: RelatorioProdutosOk }
  | { status: "erro"; mensagem: string; precisaRelogar?: boolean };

type EstadoVendas =
  | { status: "idle" }
  | { status: "carregando"; progresso: ProgressoSync | null }
  | {
      status: "ok";
      porSku: Record<string, { total: number; numPedidos: number }>;
      totalPedidos: number;
    }
  | { status: "erro"; mensagem: string };

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function diasAtrasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

type EstadoVendasPlanilha =
  | { status: "idle" }
  | { status: "carregando" }
  | {
      status: "ok";
      porSku: Record<string, { total: number; numPedidos: number }>;
      totalPedidos: number;
    }
  | { status: "erro"; mensagem: string; rateLimited?: boolean };

export default function RelatorioCustos() {
  const [fonte, setFonte] = useState<Fonte>("tiny");
  const [produtos, setProdutos] = useState<ProdutoSelecionado[]>([]);
  const [dataInicio, setDataInicio] = useState(diasAtrasISO(30));
  const [dataFim, setDataFim] = useState(hojeISO());
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [dados, setDados] = useState<EstadoRelatorio>({ status: "vazio" });
  const [vendas, setVendas] = useState<EstadoVendas>({ status: "idle" });
  const [conectado, setConectado] = useState(false);

  const [entradasPlanilha, setEntradasPlanilha] = useState<EntradaCusto[] | null>(
    null
  );
  const [vendasPlanilha, setVendasPlanilha] = useState<EstadoVendasPlanilha>({
    status: "idle",
  });

  const sessionKeyRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Math.random())
  );
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function pararPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  useEffect(() => pararPolling, []);

  function iniciarPolling(setter: (p: ProgressoSync) => void) {
    pararPolling();
    pollingRef.current = setInterval(async () => {
      const p = await getProgressoSync(sessionKeyRef.current);
      if (p) setter(p);
    }, 1000);
  }

  async function gerarRelatorio() {
    if (produtos.length === 0 || !dataInicio || !dataFim) return;
    setDados({ status: "carregando", progresso: null });
    setVendas({ status: "idle" });
    iniciarPolling((p) =>
      setDados((prev) =>
        prev.status === "carregando" ? { status: "carregando", progresso: p } : prev
      )
    );
    const r = await getRelatorioProdutosV3({
      produtos,
      dataInicio,
      dataFim,
      sessionKey: sessionKeyRef.current,
    });
    pararPolling();
    if (r.ok) setDados({ status: "ok", resultado: r });
    else
      setDados({
        status: "erro",
        mensagem: r.mensagem,
        precisaRelogar: r.precisaRelogar,
      });
  }

  async function carregarVendas() {
    if (produtos.length === 0) return;
    setVendas({ status: "carregando", progresso: null });
    iniciarPolling((p) =>
      setVendas((prev) =>
        prev.status === "carregando" ? { status: "carregando", progresso: p } : prev
      )
    );
    const r = await getSaidasProdutosV3({
      skus: produtos.map((p) => p.sku),
      ids: produtos.map((p) => p.id),
      dataInicio,
      dataFim,
      sessionKey: sessionKeyRef.current,
    });
    pararPolling();
    if (r.ok)
      setVendas({
        status: "ok",
        porSku: r.porSku,
        totalPedidos: r.totalPedidos,
      });
    else setVendas({ status: "erro", mensagem: r.mensagem });
  }

  function onMudouStatus(s: StatusAuth) {
    setConectado(s.connected);
  }

  async function carregarVendasPlanilha(forcar = false) {
    if (!entradasPlanilha) return;
    setVendasPlanilha({ status: "carregando" });
    const r = await getSaidasPeriodoTiny({
      dataInicio,
      dataFim,
      forcar,
    });
    if (r.ok)
      setVendasPlanilha({
        status: "ok",
        porSku: r.porSku,
        totalPedidos: r.totalPedidos,
      });
    else
      setVendasPlanilha({
        status: "erro",
        mensagem: r.erro,
        rateLimited: r.rateLimited,
      });
  }

  const produtosResultado: ProdutoRelatorio[] = useMemo(() => {
    if (fonte === "planilha") {
      if (!entradasPlanilha) return [];
      const filtradas = filtraPorData(entradasPlanilha, dataInicio, dataFim);
      const agrupados = agrupaPorProduto(filtradas);
      const porSku =
        vendasPlanilha.status === "ok" ? vendasPlanilha.porSku : undefined;
      return adaptaPlanilhaParaRelatorio(agrupados, porSku);
    }
    if (dados.status !== "ok") return [];
    if (vendas.status !== "ok") return dados.resultado.produtos;
    return dados.resultado.produtos.map((p) => {
      const v = vendas.porSku[p.sku.trim().toLowerCase()];
      return v
        ? { ...p, saidasNoPeriodo: v.total, numPedidosVenda: v.numPedidos }
        : p;
    });
  }, [fonte, entradasPlanilha, dataInicio, dataFim, vendasPlanilha, dados, vendas]);

  const resumo = useMemo(() => {
    let entradas = 0,
      itens = 0,
      valor = 0,
      saidas = 0;
    for (const p of produtosResultado) {
      entradas += p.notas.length;
      itens += p.quantidadeTotal;
      valor += p.valorTotalGeral;
      saidas += p.saidasNoPeriodo;
    }
    return {
      totalProdutos: produtosResultado.length,
      totalEntradas: entradas,
      quantidadeTotalItens: itens,
      valorTotalCompras: valor,
      totalSaidas: saidas,
    };
  }, [produtosResultado]);

  const toggle = (sku: string) =>
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });

  const podeGerar =
    conectado &&
    produtos.length > 0 &&
    !!dataInicio &&
    !!dataFim &&
    dados.status !== "carregando";

  const vendasCarregadas =
    fonte === "planilha"
      ? vendasPlanilha.status === "ok"
      : vendas.status === "ok";

  const totalPedidosExibido =
    fonte === "planilha"
      ? vendasPlanilha.status === "ok"
        ? vendasPlanilha.totalPedidos
        : 0
      : vendas.status === "ok"
      ? vendas.totalPedidos
      : 0;

  const errosParciais =
    fonte === "tiny" && dados.status === "ok"
      ? dados.resultado.meta.errosParciais
      : [];

  return (
    <div className="p-4">
      <h1 className="text-2xl text-white font-bold mb-1">
        Relatório de Custos por Produto
      </h1>
      <p className="text-sky-200 text-sm mb-4">
        {fonte === "tiny"
          ? "Busque os produtos, defina o período e gere o relatório direto da API V3 do Tiny."
          : "Importe a planilha de notas fiscais de compra exportada do Tiny."}
      </p>

      <div className="inline-flex bg-white/5 border border-white/10 rounded-xl p-1 mb-4">
        <button
          onClick={() => setFonte("tiny")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            fonte === "tiny"
              ? "bg-sky-700 text-white"
              : "text-sky-300 hover:text-white"
          }`}
        >
          <Plug className="w-3.5 h-3.5" />
          API Tiny V3
        </button>
        <button
          onClick={() => setFonte("planilha")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            fonte === "planilha"
              ? "bg-emerald-700 text-white"
              : "text-sky-300 hover:text-white"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Importar planilha
        </button>
      </div>

      {fonte === "tiny" ? (
        <>
          <StatusAutenticacaoTiny onMudouStatus={onMudouStatus} />

          <SeletorProdutos
            selecionados={produtos}
            onChange={setProdutos}
            desabilitado={!conectado || dados.status === "carregando"}
          />

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-sky-300 font-medium">Data início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-sky-300 font-medium">Data fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                onClick={gerarRelatorio}
                disabled={!podeGerar}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white border border-sky-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {dados.status === "carregando" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Gerar relatório
                  </>
                )}
              </button>
              {dados.status === "ok" && (
                <button
                  onClick={carregarVendas}
                  disabled={
                    !conectado ||
                    vendas.status === "carregando" ||
                    produtos.length === 0
                  }
                  className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-rose-700/70 hover:bg-rose-600/80 text-white border border-rose-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Buscar vendas — pode demorar alguns minutos"
                >
                  {vendas.status === "carregando" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Buscando vendas…
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      {vendas.status === "ok" ? "Recarregar vendas" : "Carregar vendas"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {dados.status === "erro" && (
            <div className="bg-red-900/40 border border-red-700/40 rounded-xl p-3 mb-4 text-sm text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {dados.mensagem}
              {dados.precisaRelogar && (
                <a
                  href="/api/tiny/auth/login"
                  className="ml-2 underline text-red-100 hover:text-white"
                >
                  Reconectar
                </a>
              )}
            </div>
          )}

          {dados.status === "carregando" && (
            <BarraProgresso
              titulo="Gerando relatório"
              progresso={dados.progresso}
            />
          )}

          {vendas.status === "carregando" && (
            <BarraProgresso
              titulo="Buscando vendas (pedidos do período)"
              progresso={vendas.progresso}
            />
          )}

          {vendas.status === "erro" && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-xl p-3 mb-4 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Falha ao carregar vendas: {vendas.mensagem}
            </div>
          )}
        </>
      ) : (
        <>
          <LerPlanilhaCustos setEntradas={setEntradasPlanilha} />

          {entradasPlanilha && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-sky-300 font-medium">
                    Data início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-sky-300 font-medium">
                    Data fim
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  onClick={() =>
                    carregarVendasPlanilha(vendasPlanilha.status === "ok")
                  }
                  disabled={
                    vendasPlanilha.status === "carregando" ||
                    !dataInicio ||
                    !dataFim
                  }
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-rose-700/70 hover:bg-rose-600/80 text-white border border-rose-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Buscar vendas pela API V2 do Tiny"
                >
                  {vendasPlanilha.status === "carregando" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Buscando vendas…
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      {vendasPlanilha.status === "ok"
                        ? "Recarregar vendas"
                        : "Carregar vendas do período"}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {vendasPlanilha.status === "erro" && (
            <div className="bg-red-900/30 border border-red-700/40 rounded-xl p-3 mb-4 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {vendasPlanilha.rateLimited
                ? "Limite da API Tiny atingido — tente novamente em 1 minuto."
                : `Falha ao carregar vendas: ${vendasPlanilha.mensagem}`}
            </div>
          )}
        </>
      )}

      {produtosResultado.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <DashCard
              icon={<Package className="w-5 h-5 text-sky-400" />}
              label="Produtos"
              value={resumo.totalProdutos.toString()}
              bg="from-sky-900/60 to-sky-800/40"
            />
            <DashCard
              icon={<Hash className="w-5 h-5 text-indigo-400" />}
              label="Entradas (NFs)"
              value={resumo.totalEntradas.toString()}
              bg="from-indigo-900/60 to-indigo-800/40"
            />
            <DashCard
              icon={<ShoppingBag className="w-5 h-5 text-emerald-400" />}
              label="Itens comprados"
              value={resumo.quantidadeTotalItens.toLocaleString("pt-BR")}
              bg="from-emerald-900/60 to-emerald-800/40"
            />
            <DashCard
              icon={<DollarSign className="w-5 h-5 text-amber-400" />}
              label="Total investido"
              value={formataMoeda(resumo.valorTotalCompras)}
              bg="from-amber-900/60 to-amber-800/40"
            />
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-sky-200">
            <BarChart3 className="w-4 h-4" />
            <span>
              Período:{" "}
              <strong className="text-white">{formataData(dataInicio)}</strong>{" "}
              até{" "}
              <strong className="text-white">{formataData(dataFim)}</strong>
            </span>
            {vendasCarregadas && (
              <>
                <span className="text-sky-400">·</span>
                <span>
                  {totalPedidosExibido} pedido
                  {totalPedidosExibido !== 1 ? "s" : ""} no período
                </span>
              </>
            )}
            {errosParciais.length > 0 && (
              <span
                className="ml-1 bg-amber-700/60 text-amber-100 px-2 py-0.5 rounded-full text-xs"
                title={errosParciais.join("\n")}
              >
                {errosParciais.length} aviso{errosParciais.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="rounded-xl overflow-hidden border border-white/10">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr_40px] bg-sky-900/80 text-sky-200 text-xs font-semibold uppercase px-4 py-3 gap-2">
              <span>Produto / SKU</span>
              <span className="text-right">Qtd. Entradas</span>
              <span className="text-right">Último Preço</span>
              <span className="text-right">Custo Médio</span>
              <span className="text-right">Total Comprado</span>
              <span className="text-right">Vendas no Período</span>
              <span />
            </div>
            <div className="divide-y divide-white/5">
              {produtosResultado.map((p) => (
                <ProdutoLinha
                  key={p.sku || p.idProdutoTiny}
                  produto={p}
                  expandido={expandidos.has(p.sku)}
                  onToggle={() => toggle(p.sku)}
                  vendasCarregadas={vendasCarregadas}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {fonte === "tiny" &&
        dados.status === "ok" &&
        produtosResultado.length === 0 && (
          <div className="text-center py-12 text-sky-400 text-sm">
            Nenhuma entrada encontrada no período para os produtos selecionados.
          </div>
        )}

      {fonte === "tiny" &&
        dados.status === "vazio" &&
        conectado &&
        produtos.length === 0 && (
          <div className="text-center py-12 text-sky-400 text-sm">
            Busque e selecione um ou mais produtos para começar.
          </div>
        )}
    </div>
  );
}

function BarraProgresso({
  titulo,
  progresso,
}: {
  titulo: string;
  progresso: ProgressoSync | null;
}) {
  if (!progresso) {
    return (
      <div className="bg-sky-900/40 border border-sky-700/40 rounded-xl p-4 mb-4 flex items-center gap-2 text-sm text-sky-200">
        <Loader2 className="w-4 h-4 animate-spin" />
        {titulo}…
      </div>
    );
  }
  const pct =
    progresso.total > 0
      ? Math.min(100, Math.round((progresso.atual / progresso.total) * 100))
      : 0;
  return (
    <div className="bg-sky-900/40 border border-sky-700/40 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between text-xs text-sky-200 mb-2">
        <span className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {titulo}: {progresso.etapa}
        </span>
        <span>
          {progresso.atual}/{progresso.total || "?"} ({pct}%)
        </span>
      </div>
      <div className="w-full h-2 bg-sky-950 rounded-full overflow-hidden">
        <div
          className="h-full bg-sky-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DashCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${bg} border border-white/10 rounded-xl p-4 flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2 text-xs text-sky-300 font-medium">
        {icon}
        {label}
      </div>
      <p className="text-white font-bold text-lg leading-none">{value}</p>
    </div>
  );
}

function ProdutoLinha({
  produto,
  expandido,
  onToggle,
  vendasCarregadas,
}: {
  produto: ProdutoRelatorio;
  expandido: boolean;
  onToggle: () => void;
  vendasCarregadas: boolean;
}) {
  const nEntradas = produto.notas.length;
  const variacaoPreco =
    produto.notas.length > 1
      ? Math.max(...produto.notas.map((e) => e.precoUnitario)) -
        Math.min(...produto.notas.map((e) => e.precoUnitario))
      : 0;

  return (
    <>
      <div
        className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr_40px] px-4 py-3 gap-2 items-center transition-colors cursor-pointer text-sm ${
          expandido ? "bg-sky-800/30" : "bg-transparent hover:bg-white/5"
        }`}
        onClick={onToggle}
      >
        <div>
          <p className="text-white font-medium text-sm leading-tight">
            {produto.produto}
          </p>
          <p className="text-sky-400 text-xs mt-0.5">
            SKU: {produto.sku}
            {nEntradas > 1 && (
              <span className="ml-2 text-sky-500">· {nEntradas} entradas</span>
            )}
            {variacaoPreco > 0 && (
              <span className="ml-2 text-amber-400">
                · variação {formataMoeda(variacaoPreco)}
              </span>
            )}
          </p>
        </div>
        <span className="text-right text-sky-100">
          {produto.quantidadeTotal.toLocaleString("pt-BR")}
        </span>
        <span className="text-right text-sky-100">
          {formataMoeda(produto.ultimoPreco)}
        </span>
        <span className="text-right font-semibold text-emerald-300">
          {formataMoeda(produto.custoMedio)}
        </span>
        <span className="text-right text-amber-200 font-medium">
          {formataMoeda(produto.valorTotalGeral)}
        </span>
        <div className="flex justify-end items-center text-sm">
          {!vendasCarregadas ? (
            <span className="text-sky-600 text-xs">—</span>
          ) : produto.saidasNoPeriodo > 0 ? (
            <span className="flex items-center gap-2">
              <span className="font-semibold text-rose-300">
                <TrendingDown className="w-3.5 h-3.5 inline mr-1" />
                {produto.saidasNoPeriodo.toLocaleString("pt-BR")}
              </span>
              <span className="text-[10px] text-sky-500">
                {produto.numPedidosVenda} ped.
              </span>
            </span>
          ) : (
            <span className="text-sky-600 text-xs">0</span>
          )}
        </div>
        <div className="flex justify-center text-sky-400">
          {expandido ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {expandido && produto.notas.length > 0 && (
        <div className="bg-sky-950/60 border-t border-white/5">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1.2fr_40px] px-8 py-2 gap-2 text-xs text-sky-400 font-semibold uppercase bg-sky-950/40">
            <span>N° NF</span>
            <span>Data</span>
            <span className="text-right">Quantidade</span>
            <span className="text-right">Preço Unit.</span>
            <span className="text-right">Valor Total</span>
            <span />
            <span />
          </div>
          {produto.notas.map((e, i) => (
            <div
              key={`${e.idNota}-${i}`}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1.2fr_40px] px-8 py-2 gap-2 text-xs text-sky-200 border-t border-white/5 hover:bg-white/5"
            >
              <span className="font-mono text-sky-400">{e.numero}</span>
              <span>{e.data}</span>
              <span className="text-right">
                {e.quantidade.toLocaleString("pt-BR")}
              </span>
              <span className="text-right">{formataMoeda(e.precoUnitario)}</span>
              <span className="text-right text-emerald-300">
                {formataMoeda(e.valorTotal)}
              </span>
              <span />
              <span />
            </div>
          ))}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1.2fr_40px] px-8 py-2 gap-2 text-xs font-bold text-white bg-sky-900/40 border-t border-sky-700/30">
            <span className="text-sky-300">Subtotal</span>
            <span />
            <span className="text-right">
              {produto.quantidadeTotal.toLocaleString("pt-BR")}
            </span>
            <span className="text-right text-emerald-300">
              {formataMoeda(produto.custoMedio)}{" "}
              <span className="font-normal text-sky-400">(médio)</span>
            </span>
            <span className="text-right text-amber-300">
              {formataMoeda(produto.valorTotalGeral)}
            </span>
            <span />
            <span />
          </div>
        </div>
      )}
    </>
  );
}
