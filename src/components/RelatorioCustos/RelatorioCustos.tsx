"use client";

import {
  CmvResultadoOk,
  gerarRelatorioCmvV3,
} from "@/actions/v3/gerarRelatorioCmvV3";
import { getProgressoSync } from "@/actions/v3/getProgressoSync";
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
  Info,
  Loader2,
  Package,
  Percent,
  Plug,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import LerPlanilhaCustos from "./LerPlanilhaCustos";
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
  | { status: "ok"; resultado: CmvResultadoOk }
  | { status: "erro"; mensagem: string; precisaRelogar?: boolean };

type EstadoVendasPlanilha =
  | { status: "idle" }
  | { status: "carregando" }
  | {
    status: "ok";
    porSku: Record<string, { total: number; numPedidos: number }>;
    totalPedidos: number;
  }
  | { status: "erro"; mensagem: string; rateLimited?: boolean };

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

export default function RelatorioCustos() {
  const [fonte, setFonte] = useState<Fonte>("tiny");
  const [dataInicio, setDataInicio] = useState(diasAtrasISO(30));
  const [dataFim, setDataFim] = useState(hojeISO());
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [dados, setDados] = useState<EstadoRelatorio>({ status: "vazio" });
  const [conectado, setConectado] = useState(false);

  const [entradasPlanilha, setEntradasPlanilha] = useState<
    EntradaCusto[] | null
  >(null);
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
    const tick = async () => {
      const p = await getProgressoSync(sessionKeyRef.current);
      if (p) setter(p);
    };
    void tick();
    pollingRef.current = setInterval(tick, 800);
  }

  async function gerarRelatorio(forcar = false) {
    if (!dataInicio || !dataFim) return;
    setDados({ status: "carregando", progresso: null });
    iniciarPolling((p) =>
      setDados((prev) =>
        prev.status === "carregando"
          ? { status: "carregando", progresso: p }
          : prev
      )
    );
    const r = await gerarRelatorioCmvV3({
      dataInicio,
      dataFim,
      sessionKey: sessionKeyRef.current,
      forcar,
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

  function onMudouStatus(s: StatusAuth) {
    setConectado(s.connected);
  }

  const produtosTiny: ProdutoRelatorio[] = useMemo(() => {
    if (fonte !== "tiny" || dados.status !== "ok") return [];
    return dados.resultado.produtos;
  }, [fonte, dados]);

  const produtosPlanilha: ProdutoRelatorio[] = useMemo(() => {
    if (fonte !== "planilha" || !entradasPlanilha) return [];
    const filtradas = filtraPorData(entradasPlanilha, dataInicio, dataFim);
    const agrupados = agrupaPorProduto(filtradas);
    const porSku =
      vendasPlanilha.status === "ok" ? vendasPlanilha.porSku : undefined;
    return adaptaPlanilhaParaRelatorio(agrupados, porSku);
  }, [fonte, entradasPlanilha, dataInicio, dataFim, vendasPlanilha]);

  const produtosFiltrados = useMemo(() => {
    const base = fonte === "tiny" ? produtosTiny : produtosPlanilha;
    if (!busca.trim()) return base;
    const t = busca.toLowerCase();
    return base.filter(
      (p) =>
        p.produto.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)
    );
  }, [fonte, produtosTiny, produtosPlanilha, busca]);

  const toggle = (sku: string) =>
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });

  return (
    <div className="p-4">
      <h1 className="text-2xl text-white font-bold mb-1">
        Relatório de Custo da Mercadoria Vendida (CMV)
      </h1>
      <p className="text-sky-200 text-sm mb-4">
        {fonte === "tiny"
          ? "Para o período informado: receita, custo e margem por SKU vendido."
          : "Importe a planilha de notas fiscais de compra exportada do Tiny."}
      </p>

      <div className="inline-flex bg-white/5 border border-white/10 rounded-xl p-1 mb-4">
        <button
          onClick={() => setFonte("tiny")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${fonte === "tiny"
              ? "bg-sky-700 text-white"
              : "text-sky-300 hover:text-white"
            }`}
        >
          <Plug className="w-3.5 h-3.5" />
          API Tiny V3
        </button>
        <button
          onClick={() => setFonte("planilha")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${fonte === "planilha"
              ? "bg-emerald-700 text-white"
              : "text-sky-300 hover:text-white"
            }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Importar planilha
        </button>
      </div>

      {fonte === "tiny" ? (
        <BlocoTiny
          conectado={conectado}
          onMudouStatus={onMudouStatus}
          dataInicio={dataInicio}
          setDataInicio={setDataInicio}
          dataFim={dataFim}
          setDataFim={setDataFim}
          busca={busca}
          setBusca={setBusca}
          dados={dados}
          gerarRelatorio={gerarRelatorio}
        />
      ) : (
        <BlocoPlanilha
          setEntradas={setEntradasPlanilha}
          temEntradas={!!entradasPlanilha}
          dataInicio={dataInicio}
          setDataInicio={setDataInicio}
          dataFim={dataFim}
          setDataFim={setDataFim}
          busca={busca}
          setBusca={setBusca}
          vendasPlanilha={vendasPlanilha}
          onCarregarVendas={() =>
            carregarVendasPlanilha(vendasPlanilha.status === "ok")
          }
        />
      )}

      {fonte === "tiny" && dados.status === "ok" && (
        <ResultadoCmv
          resultado={dados.resultado}
          produtos={produtosFiltrados}
          expandidos={expandidos}
          onToggle={toggle}
          dataInicio={dataInicio}
          dataFim={dataFim}
        />
      )}

      {fonte === "planilha" && produtosFiltrados.length > 0 && (
        <ResultadoPlanilha
          produtos={produtosFiltrados}
          expandidos={expandidos}
          onToggle={toggle}
          dataInicio={dataInicio}
          dataFim={dataFim}
          totalPedidos={
            vendasPlanilha.status === "ok" ? vendasPlanilha.totalPedidos : 0
          }
          vendasCarregadas={vendasPlanilha.status === "ok"}
        />
      )}

      {fonte === "tiny" &&
        dados.status === "ok" &&
        produtosFiltrados.length === 0 && (
          <div className="text-center py-12 text-sky-400 text-sm">
            Nenhum produto vendido no período (ou nenhum bate com o filtro).
          </div>
        )}

      {fonte === "tiny" && dados.status === "vazio" && conectado && (
        <div className="text-center py-12 text-sky-400 text-sm">
          Defina o período e clique em <strong>Gerar relatório</strong>.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Blocos do topo (formulário)
// ─────────────────────────────────────────────────────────────────────

function BlocoTiny({
  conectado,
  onMudouStatus,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  busca,
  setBusca,
  dados,
  gerarRelatorio,
}: {
  conectado: boolean;
  onMudouStatus: (s: StatusAuth) => void;
  dataInicio: string;
  setDataInicio: (v: string) => void;
  dataFim: string;
  setDataFim: (v: string) => void;
  busca: string;
  setBusca: (v: string) => void;
  dados: EstadoRelatorio;
  gerarRelatorio: (forcar?: boolean) => void;
}) {
  const carregando = dados.status === "carregando";
  const podeGerar = conectado && !!dataInicio && !!dataFim && !carregando;

  return (
    <>
      <StatusAutenticacaoTiny onMudouStatus={onMudouStatus} />

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
            <label className="text-xs text-sky-300 font-medium">Data fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <button
            onClick={() => gerarRelatorio(false)}
            disabled={!podeGerar}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white border border-sky-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {carregando ? (
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
              onClick={() => gerarRelatorio(true)}
              disabled={!conectado || carregando}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-sky-800/50 hover:bg-sky-700/60 text-sky-100 border border-sky-600/40"
              title="Forçar reconsulta"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Forçar
            </button>
          )}
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label className="text-xs text-sky-300 font-medium">
              Buscar produto / SKU
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtre a tabela..."
              className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-sky-600"
            />
          </div>
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
          titulo="Gerando relatório CMV"
          progresso={dados.progresso}
        />
      )}
    </>
  );
}

function BlocoPlanilha({
  setEntradas,
  temEntradas,
  dataInicio,
  setDataInicio,
  dataFim,
  setDataFim,
  busca,
  setBusca,
  vendasPlanilha,
  onCarregarVendas,
}: {
  setEntradas: (
    v: EntradaCusto[] | null | ((p: EntradaCusto[] | null) => EntradaCusto[] | null)
  ) => void;
  temEntradas: boolean;
  dataInicio: string;
  setDataInicio: (v: string) => void;
  dataFim: string;
  setDataFim: (v: string) => void;
  busca: string;
  setBusca: (v: string) => void;
  vendasPlanilha: EstadoVendasPlanilha;
  onCarregarVendas: () => void;
}) {
  return (
    <>
      <LerPlanilhaCustos setEntradas={setEntradas} />

      {temEntradas && (
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
              onClick={onCarregarVendas}
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
            <div className="flex flex-col gap-1 flex-1 min-w-48">
              <label className="text-xs text-sky-300 font-medium">
                Buscar produto / SKU
              </label>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtre a tabela..."
                className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-sky-600"
              />
            </div>
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
  );
}

// ─────────────────────────────────────────────────────────────────────
// Resultado modo Tiny (CMV)
// ─────────────────────────────────────────────────────────────────────

function ResultadoCmv({
  resultado,
  produtos,
  expandidos,
  onToggle,
  dataInicio,
  dataFim,
}: {
  resultado: CmvResultadoOk;
  produtos: ProdutoRelatorio[];
  expandidos: Set<string>;
  onToggle: (sku: string) => void;
  dataInicio: string;
  dataFim: string;
}) {
  const m = resultado.meta;
  const corMargem =
    m.margemTotalReais >= 0 ? "text-emerald-300" : "text-rose-300";

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <DashCard
          icon={<ShoppingBag className="w-5 h-5 text-sky-400" />}
          label="Pedidos entregues"
          value={m.totalPedidos.toString()}
          bg="from-sky-900/60 to-sky-800/40"
        />
        <DashCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          label="Receita total"
          value={formataMoeda(m.receitaTotal)}
          bg="from-emerald-900/60 to-emerald-800/40"
        />
        <DashCard
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
          label="CMV total"
          value={formataMoeda(m.cmvTotal)}
          bg="from-amber-900/60 to-amber-800/40"
        />
        <DashCard
          icon={<Percent className="w-5 h-5 text-indigo-400" />}
          label="Margem total"
          value={`${formataMoeda(m.margemTotalReais)} (${m.margemTotalPercent.toFixed(
            1
          )}%)`}
          bg="from-indigo-900/60 to-indigo-800/40"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-sky-200">
        <BarChart3 className="w-4 h-4" />
        <span>
          Período:{" "}
          <strong className="text-white">{formataData(dataInicio)}</strong> até{" "}
          <strong className="text-white">{formataData(dataFim)}</strong>
        </span>
        <span className="text-sky-400">·</span>
        <span>{m.totalSkusVendidos} SKUs vendidos</span>
        {m.cacheado && (
          <span className="ml-1 bg-sky-700 text-sky-100 px-2 py-0.5 rounded-full text-xs">
            cache
          </span>
        )}
        {m.errosParciais.length > 0 && (
          <span
            className="ml-1 bg-amber-700/60 text-amber-100 px-2 py-0.5 rounded-full text-xs"
            title={m.errosParciais.join("\n")}
          >
            {m.errosParciais.length} aviso
            {m.errosParciais.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {(m.skusComFallback > 0 || m.skusSemCusto > 0) && (
        <div className="bg-amber-900/30 border border-amber-700/40 rounded-xl p-3 mb-4 text-xs text-amber-100 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            {m.skusComFallback > 0 && (
              <div>
                <strong>{m.skusComFallback}</strong> SKU
                {m.skusComFallback !== 1 ? "s" : ""} sem entrada no período —
                custo unitário usa o último lançamento histórico (badge{" "}
                <span className="text-amber-200">histórico</span>).
              </div>
            )}
            {m.skusSemCusto > 0 && (
              <div>
                <strong>{m.skusSemCusto}</strong> SKU
                {m.skusSemCusto !== 1 ? "s" : ""} sem custo registrado (badge{" "}
                <span className="text-sky-300">—</span>) — CMV considerado 0.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-white/10">
        <div className="grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_0.8fr_40px] bg-sky-900/80 text-sky-200 text-xs font-semibold uppercase px-4 py-3 gap-2">
          <span>Produto / SKU</span>
          <span className="text-right">Qtd Vend.</span>
          <span className="text-right">Receita</span>
          <span className="text-right">Custo Unit.</span>
          <span className="text-right">CMV</span>
          <span className="text-right">Margem R$</span>
          <span className="text-right">Margem %</span>
          <span />
        </div>
        <div className="divide-y divide-white/5">
          {produtos.map((p) => (
            <ProdutoLinhaCmv
              key={p.sku || p.idProdutoTiny}
              produto={p}
              expandido={expandidos.has(p.sku)}
              onToggle={() => onToggle(p.sku)}
            />
          ))}
        </div>
        <div className="grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_0.8fr_40px] bg-sky-900/60 text-white text-xs font-bold px-4 py-3 gap-2 border-t border-sky-700/50">
          <span className="text-sky-200">
            {produtos.length} produto{produtos.length !== 1 ? "s" : ""}
          </span>
          <span className="text-right">
            {produtos
              .reduce((s, p) => s + (p.quantidadeTotal ?? 0), 0)
              .toLocaleString("pt-BR")}
          </span>
          <span className="text-right text-emerald-300">
            {formataMoeda(produtos.reduce((s, p) => s + (p.receita ?? 0), 0))}
          </span>
          <span />
          <span className="text-right text-amber-300">
            {formataMoeda(produtos.reduce((s, p) => s + (p.cmv ?? 0), 0))}
          </span>
          <span className={`text-right ${corMargem}`}>
            {formataMoeda(
              produtos.reduce((s, p) => s + (p.margemReais ?? 0), 0)
            )}
          </span>
          <span />
          <span />
        </div>
      </div>
    </>
  );
}

function ProdutoLinhaCmv({
  produto,
  expandido,
  onToggle,
}: {
  produto: ProdutoRelatorio;
  expandido: boolean;
  onToggle: () => void;
}) {
  const margemPct = produto.margemPercent ?? 0;
  const corMargem =
    (produto.margemReais ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300";

  return (
    <>
      <div
        className={`grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_0.8fr_40px] px-4 py-3 gap-2 items-center transition-colors cursor-pointer text-sm ${expandido ? "bg-sky-800/30" : "bg-transparent hover:bg-white/5"
          }`}
        onClick={onToggle}
      >
        <div>
          <p className="text-white font-medium text-sm leading-tight">
            {produto.produto}
          </p>
          <p className="text-sky-400 text-xs mt-0.5">
            SKU: {produto.sku}
            <BadgeOrigem origem={produto.origemCusto} />
          </p>
        </div>
        <span className="text-right text-sky-100">
          {produto.quantidadeTotal.toLocaleString("pt-BR")}
        </span>
        <span className="text-right text-emerald-200">
          {formataMoeda(produto.receita ?? 0)}
        </span>
        <span className="text-right text-sky-100">
          {formataMoeda(produto.custoUnitario ?? 0)}
        </span>
        <span className="text-right text-amber-200 font-medium">
          {formataMoeda(produto.cmv ?? 0)}
        </span>
        <span className={`text-right font-semibold ${corMargem}`}>
          {formataMoeda(produto.margemReais ?? 0)}
        </span>
        <span className={`text-right ${corMargem}`}>
          {margemPct.toFixed(1)}%
        </span>
        <div className="flex justify-center text-sky-400">
          {expandido ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {expandido && (produto.pedidos?.length ?? 0) > 0 && (
        <div className="bg-sky-950/60 border-t border-white/5">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_40px] px-8 py-2 gap-2 text-xs text-sky-400 font-semibold uppercase bg-sky-950/40">
            <span>N° Pedido</span>
            <span>Data</span>
            <span className="text-right">Quantidade</span>
            <span className="text-right">Preço Unit.</span>
            <span className="text-right">Valor Total</span>
            <span />
          </div>
          {produto.pedidos!.map((it, i) => (
            <div
              key={`${it.idPedido}-${i}`}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_40px] px-8 py-2 gap-2 text-xs text-sky-200 border-t border-white/5 hover:bg-white/5"
            >
              <span className="font-mono text-sky-400">{it.numero}</span>
              <span>{it.data}</span>
              <span className="text-right">
                {it.quantidade.toLocaleString("pt-BR")}
              </span>
              <span className="text-right">
                {formataMoeda(it.valorUnitario)}
              </span>
              <span className="text-right text-emerald-300">
                {formataMoeda(it.valorTotal)}
              </span>
              <span />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BadgeOrigem({ origem }: { origem?: ProdutoRelatorio["origemCusto"] }) {
  if (!origem) return null;
  if (origem === "periodo")
    return (
      <span className="ml-2 inline-block bg-emerald-900/60 text-emerald-200 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
        período
      </span>
    );
  if (origem === "historico")
    return (
      <span className="ml-2 inline-block bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
        histórico
      </span>
    );
  return (
    <span className="ml-2 inline-block bg-sky-900/60 text-sky-300 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">
      sem custo
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Resultado modo Planilha (legado)
// ─────────────────────────────────────────────────────────────────────

function ResultadoPlanilha({
  produtos,
  expandidos,
  onToggle,
  dataInicio,
  dataFim,
  totalPedidos,
  vendasCarregadas,
}: {
  produtos: ProdutoRelatorio[];
  expandidos: Set<string>;
  onToggle: (sku: string) => void;
  dataInicio: string;
  dataFim: string;
  totalPedidos: number;
  vendasCarregadas: boolean;
}) {
  const totais = useMemo(() => {
    let qtd = 0;
    let valor = 0;
    let saidas = 0;
    for (const p of produtos) {
      qtd += p.quantidadeTotal;
      valor += p.valorTotalGeral;
      saidas += p.saidasNoPeriodo;
    }
    return { qtd, valor, saidas };
  }, [produtos]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <DashCard
          icon={<Package className="w-5 h-5 text-sky-400" />}
          label="Produtos"
          value={produtos.length.toString()}
          bg="from-sky-900/60 to-sky-800/40"
        />
        <DashCard
          icon={<Hash className="w-5 h-5 text-indigo-400" />}
          label="Entradas (linhas)"
          value={produtos
            .reduce((s, p) => s + p.notas.length, 0)
            .toString()}
          bg="from-indigo-900/60 to-indigo-800/40"
        />
        <DashCard
          icon={<ShoppingBag className="w-5 h-5 text-emerald-400" />}
          label="Itens comprados"
          value={totais.qtd.toLocaleString("pt-BR")}
          bg="from-emerald-900/60 to-emerald-800/40"
        />
        <DashCard
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
          label="Total investido"
          value={formataMoeda(totais.valor)}
          bg="from-amber-900/60 to-amber-800/40"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-sky-200">
        <BarChart3 className="w-4 h-4" />
        <span>
          Período:{" "}
          <strong className="text-white">{formataData(dataInicio)}</strong> até{" "}
          <strong className="text-white">{formataData(dataFim)}</strong>
        </span>
        {vendasCarregadas && (
          <>
            <span className="text-sky-400">·</span>
            <span>
              {totalPedidos} pedido{totalPedidos !== 1 ? "s" : ""} entregues no
              período
            </span>
          </>
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
          {produtos.map((p) => (
            <ProdutoLinhaPlanilha
              key={p.sku}
              produto={p}
              expandido={expandidos.has(p.sku)}
              onToggle={() => onToggle(p.sku)}
              vendasCarregadas={vendasCarregadas}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function ProdutoLinhaPlanilha({
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
    nEntradas > 1
      ? Math.max(...produto.notas.map((e) => e.precoUnitario)) -
      Math.min(...produto.notas.map((e) => e.precoUnitario))
      : 0;

  return (
    <>
      <div
        className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr_40px] px-4 py-3 gap-2 items-center transition-colors cursor-pointer text-sm ${expandido ? "bg-sky-800/30" : "bg-transparent hover:bg-white/5"
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
              <span className="ml-2 text-sky-500">
                · {nEntradas} entradas
              </span>
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
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Subcomponentes utilitários
// ─────────────────────────────────────────────────────────────────────

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
