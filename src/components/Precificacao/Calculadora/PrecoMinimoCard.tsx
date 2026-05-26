"use client";

import { brlConvert } from "@/functions/brlConvert";
import { formatarFaixaLabel } from "./calculos";
import { ResultadoMinimo } from "./types";

export default function PrecoMinimoCard({
  resultado,
}: {
  resultado: ResultadoMinimo;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="bg-amber-700 px-4 py-2 text-white font-semibold text-sm tracking-wide">
        PREÇO MÍNIMO RECOMENDADO
      </div>

      <div className="divide-y divide-white/10">
        <div className="flex items-center justify-between gap-4 px-4 py-2">
          <span className="text-sm text-sky-200">Faixa aplicável</span>
          <span className="text-sm text-white">
            {resultado.faixaAplicavel
              ? formatarFaixaLabel(resultado.faixaAplicavel)
              : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-emerald-900/40">
          <span className="text-sm font-semibold text-emerald-200">
            Preço mínimo de venda
          </span>
          <span className="text-lg font-bold text-emerald-300">
            {resultado.precoMinimoRecomendado != null
              ? brlConvert(resultado.precoMinimoRecomendado)
              : "—"}
          </span>
        </div>
      </div>

      {resultado.precoMinimoRecomendado == null && (
        <div className="px-4 py-2 text-xs text-amber-300">
          Nenhuma faixa cabe no preço mínimo calculado. Revise a tabela de
          comissões.
        </div>
      )}
    </div>
  );
}
