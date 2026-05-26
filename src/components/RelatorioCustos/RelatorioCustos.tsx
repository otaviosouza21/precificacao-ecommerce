"use client";

import { gerarRelatorioCmvV3 } from "@/actions/v3/gerarRelatorioCmvV3";
import { getProgressoSync } from "@/actions/v3/getProgressoSync";
import type { ProgressoSync } from "@/actions/v3/progressoStore";
import { getSaidasPeriodoTiny } from "@/actions/getSaidasPeriodoTiny";
import type { StatusAuth } from "@/lib/tiny/types";
import { FileSpreadsheet, Plug } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import BlocoPlanilha from "./partes/BlocoPlanilha";
import BlocoTiny from "./partes/BlocoTiny";
import ResultadoCmv from "./partes/ResultadoCmv";
import ResultadoPlanilha from "./partes/ResultadoPlanilha";
import { agrupaPorProduto, filtraPorData, EntradaCusto } from "./processaCustos";
import type {
  EstadoRelatorio,
  EstadoVendasPlanilha,
  Fonte,
  ProdutoRelatorio,
} from "./types";
import {
  adaptaPlanilhaParaRelatorio,
  diasAtrasISO,
  hojeISO,
} from "./utils";

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
