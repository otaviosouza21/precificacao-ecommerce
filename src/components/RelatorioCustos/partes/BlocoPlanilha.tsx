"use client";

import { AlertCircle, Loader2, TrendingDown } from "lucide-react";
import LerPlanilhaCustos from "../LerPlanilhaCustos";
import type { EntradaCusto } from "../processaCustos";
import type { EstadoVendasPlanilha } from "../types";

export default function BlocoPlanilha({
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
    v:
      | EntradaCusto[]
      | null
      | ((p: EntradaCusto[] | null) => EntradaCusto[] | null)
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
