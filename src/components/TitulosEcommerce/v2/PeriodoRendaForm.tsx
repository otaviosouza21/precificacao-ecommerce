"use client";

import { CalendarRange, Loader2, Search } from "lucide-react";

type PeriodoRendaFormProps = {
  de: string;
  ate: string;
  setDe: (valor: string) => void;
  setAte: (valor: string) => void;
  onBuscar: () => void;
  carregando: boolean;
};

// Seleção do período de recebimento (substitui o upload da planilha da v1).
// A renda é buscada direto na API da Shopee pela data de recebimento.
export default function PeriodoRendaForm({
  de,
  ate,
  setDe,
  setAte,
  onBuscar,
  carregando,
}: PeriodoRendaFormProps) {
  const intervaloInvalido = Boolean(de && ate && de > ate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intervaloInvalido || carregando) return;
    onBuscar();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full my-4 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-5"
    >
      <div className="mb-4 flex items-center gap-2 text-sky-800">
        <CalendarRange className="h-5 w-5" />
        <h2 className="text-sm font-semibold">
          Período de recebimento (renda Shopee)
        </h2>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">De</span>
          <input
            type="date"
            value={de}
            max={ate || undefined}
            onChange={(e) => setDe(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Até</span>
          <input
            type="date"
            value={ate}
            min={de || undefined}
            onChange={(e) => setAte(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
          />
        </label>

        <button
          type="submit"
          disabled={carregando || intervaloInvalido}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {carregando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {carregando ? "Buscando..." : "Buscar renda"}
        </button>
      </div>

      {intervaloInvalido && (
        <p className="mt-3 text-xs font-medium text-red-600">
          A data inicial não pode ser maior que a final.
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Dica: prefira intervalos curtos (1 dia a 1 semana) — a varredura na
        Shopee fica mais lenta em períodos longos.
      </p>
    </form>
  );
}
