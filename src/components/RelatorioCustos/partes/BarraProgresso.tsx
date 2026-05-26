"use client";

import { Loader2 } from "lucide-react";
import type { ProgressoSync } from "@/actions/v3/progressoStore";

export default function BarraProgresso({
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
