"use client";

import {
  BarChart3,
  DollarSign,
  Info,
  Percent,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import type { CmvResultadoOk } from "@/actions/v3/gerarRelatorioCmvV3";
import type { ProdutoRelatorio } from "../types";
import { formataData, formataMoeda } from "../utils";
import DashCard from "./DashCard";
import ProdutoLinhaCmv from "./ProdutoLinhaCmv";

export default function ResultadoCmv({
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
          label="Pedidos entregues / total"
          value={`${m.pedidosConsiderados} / ${m.totalPedidos}`}
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

      {Object.keys(m.situacoesEncontradas).length > 0 && (
        <div className="bg-slate-900/60 border border-sky-700/30 rounded-xl p-3 mb-4 text-xs text-sky-100 flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex flex-wrap gap-2">
            <span className="text-sky-300">Situações dos pedidos no período:</span>
            {Object.entries(m.situacoesEncontradas)
              .sort((a, b) => b[1] - a[1])
              .map(([sit, qtd]) => (
                <span
                  key={sit}
                  className={`px-2 py-0.5 rounded-full ${
                    sit === "entregue"
                      ? "bg-emerald-700/60 text-emerald-100"
                      : "bg-slate-700/60 text-slate-200"
                  }`}
                >
                  {sit}: {qtd}
                </span>
              ))}
            {m.itensSemSku > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-700/60 text-amber-100">
                {m.itensSemSku} itens sem SKU ignorados
              </span>
            )}
          </div>
        </div>
      )}

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
