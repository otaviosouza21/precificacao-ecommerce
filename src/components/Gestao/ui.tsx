"use client";

import { Loader2, X } from "lucide-react";
import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import { twMerge } from "tailwind-merge";

export function PageHeader({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-500 mt-1">{subtitulo}</p>}
      </div>
      {acao}
    </header>
  );
}

export function BotaoPrimario({
  children,
  carregando,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { carregando?: boolean }) {
  return (
    <button
      className={twMerge(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
        className,
      )}
      disabled={carregando || props.disabled}
      {...props}
    >
      {carregando && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function BotaoSecundario({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={twMerge(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

const campoBase =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100 disabled:text-slate-500";

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  dica?: string;
};

export function Campo({ label, id, dica, className, ...props }: CampoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input id={id} className={twMerge(campoBase, className)} {...props} />
      {dica && <span className="text-xs text-slate-400">{dica}</span>}
    </div>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  id: string;
  dica?: string;
};

export function CampoSelect({
  label,
  id,
  dica,
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <select id={id} className={twMerge(campoBase, className)} {...props}>
        {children}
      </select>
      {dica && <span className="text-xs text-slate-400">{dica}</span>}
    </div>
  );
}

export function MensagemErro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
      {mensagem}
    </p>
  );
}

export function Badge({
  children,
  cor = "slate",
}: {
  children: React.ReactNode;
  cor?: "green" | "slate" | "sky" | "amber";
}) {
  const cores = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        cores[cor],
      )}
    >
      {children}
    </span>
  );
}

export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  rodape,
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
  rodape: React.ReactNode;
}) {
  if (!aberto) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50">
          {rodape}
        </div>
      </div>
    </div>
  );
}

export function EstadoVazio({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      {mensagem}
    </div>
  );
}

export function EstadoCarregando() {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
      <Loader2 size={20} className="animate-spin text-sky-700" />
      Carregando...
    </div>
  );
}
