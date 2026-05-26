"use client";

import { ChevronDown, ChevronUp, TrendingDown } from "lucide-react";
import type { ProdutoRelatorio } from "../types";
import { formataMoeda } from "../utils";

export default function ProdutoLinhaPlanilha({
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
              <span className="text-right">
                {formataMoeda(e.precoUnitario)}
              </span>
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
