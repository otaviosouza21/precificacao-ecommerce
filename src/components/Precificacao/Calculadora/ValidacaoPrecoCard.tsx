"use client";

import { brlConvert } from "@/functions/brlConvert";
import { ResultadoValidacao } from "./types";

type Props = {
  precoVenda: string;
  onPrecoVendaChange: (valor: string) => void;
  validacao: ResultadoValidacao | null;
};

export default function ValidacaoPrecoCard({
  precoVenda,
  onPrecoVendaChange,
  validacao,
}: Props) {
  const positivo = (validacao?.lucro ?? 0) >= 0;
  const corResultado = positivo ? "text-emerald-300" : "text-red-400";

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="bg-orange-700 px-4 py-2 text-white font-semibold text-sm tracking-wide">
        VALIDAÇÃO DO PREÇO ESCOLHIDO
      </div>

      <div className="divide-y divide-white/10">
        <div className="flex items-center justify-between gap-4 px-4 py-2">
          <span className="text-sm text-sky-200">Preço de venda</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={precoVenda}
            onChange={(e) => onPrecoVendaChange(e.target.value)}
            placeholder="0,00"
            className="w-32 bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white text-right"
          />
        </div>
        <Linha label="Comissão aplicada">
          {validacao?.faixa ? `${validacao.comissaoPct}%` : "—"}
        </Linha>
        <Linha label="Taxa fixa aplicada">
          {validacao?.faixa ? brlConvert(validacao.taxaFixa) : "—"}
        </Linha>
        <Linha label="Valor que você recebe líquido">
          {validacao ? brlConvert(validacao.valorLiquido) : "—"}
        </Linha>
        <Linha label="Custo + margem necessária">
          {validacao ? brlConvert(validacao.custoMargemNecessaria) : "—"}
        </Linha>
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-sky-900/40">
          <span className="text-sm font-semibold text-sky-100">
            Resultado (lucro/prejuízo)
          </span>
          <div className="text-right">
            <div className={`text-lg font-bold ${corResultado}`}>
              {validacao ? brlConvert(validacao.lucro) : "—"}
            </div>
            {validacao && (
              <div className={`text-xs ${corResultado}`}>
                margem real: {validacao.margemReal.toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {validacao && !validacao.faixa && Number(precoVenda) > 0 && (
        <div className="px-4 py-2 text-xs text-orange-300">
          O preço informado não se encaixa em nenhuma faixa cadastrada.
        </div>
      )}
    </div>
  );
}

function Linha({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2">
      <span className="text-sm text-sky-200">{label}</span>
      <span className="text-sm text-white">{children}</span>
    </div>
  );
}
