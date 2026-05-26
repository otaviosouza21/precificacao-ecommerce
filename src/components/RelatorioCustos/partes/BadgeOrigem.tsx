"use client";

import type { ProdutoRelatorio } from "../types";

export default function BadgeOrigem({
  origem,
}: {
  origem?: ProdutoRelatorio["origemCusto"];
}) {
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
