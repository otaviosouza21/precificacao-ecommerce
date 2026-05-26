"use client";

import { brlConvert } from "@/functions/brlConvert";
import { formatarFaixaLabel } from "./calculos";
import { ResultadoMinimo } from "./types";

type Props = {
  marketplaceNome: string;
  resultado: ResultadoMinimo;
};

export default function TabelaComissoesCard({
  marketplaceNome,
  resultado,
}: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="bg-sky-700 px-4 py-2 text-white font-semibold text-sm tracking-wide">
        TABELA DE COMISSÕES — {marketplaceNome.toUpperCase()}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-sky-300 text-left border-b border-white/10">
            <th className="px-4 py-2 font-medium">Faixa de Preço</th>
            <th className="px-4 py-2 font-medium">Comissão (%)</th>
            <th className="px-4 py-2 font-medium">Taxa Fixa (R$)</th>
            <th className="px-4 py-2 font-medium">Preço Mínimo Calculado</th>
          </tr>
        </thead>
        <tbody>
          {resultado.porFaixa.map((linha) => {
            const aplicavel = linha.aplicavel;
            return (
              <tr
                key={linha.faixa.id}
                className={`border-b border-white/5 last:border-b-0 ${
                  aplicavel ? "bg-emerald-900/40" : "hover:bg-white/5"
                }`}
              >
                <td className="px-4 py-2 text-white">
                  {formatarFaixaLabel(linha.faixa)}
                </td>
                <td className="px-4 py-2 text-white">
                  {linha.faixa.comissaoPct}%
                </td>
                <td className="px-4 py-2 text-white">
                  {brlConvert(linha.faixa.taxaFixa)}
                </td>
                <td
                  className={`px-4 py-2 font-semibold ${
                    aplicavel ? "text-emerald-300" : "text-white"
                  }`}
                >
                  {brlConvert(linha.precoMinimo)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {resultado.porFaixa.length === 0 && (
        <div className="px-4 py-6 text-center text-sky-400 text-sm">
          Nenhuma faixa cadastrada neste marketplace.
        </div>
      )}
    </div>
  );
}
