"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ProdutoRelatorio } from "../types";
import { formataMoeda } from "../utils";
import BadgeOrigem from "./BadgeOrigem";

export default function ProdutoLinhaCmv({
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
        className={`grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_0.8fr_40px] px-4 py-3 gap-2 items-center transition-colors cursor-pointer text-sm ${
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
              key={`${it.numero}-${i}`}
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
