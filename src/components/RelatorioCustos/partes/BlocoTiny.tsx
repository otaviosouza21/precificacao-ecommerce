"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import StatusAutenticacaoTiny from "../StatusAutenticacaoTiny";
import type { EstadoRelatorio } from "../types";
import type { StatusAuth } from "@/lib/tiny/types";
import BarraProgresso from "./BarraProgresso";

export default function BlocoTiny({
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
