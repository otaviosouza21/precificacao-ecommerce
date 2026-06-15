"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { InputHTMLAttributes, useState } from "react";
import { twMerge } from "tailwind-merge";

export function AuthCard({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-800 via-sky-900 to-sky-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">Bike Line</h1>
          <p className="text-sm text-blue-200">Sistema de Automações</p>
        </div>
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800">{titulo}</h2>
          {subtitulo && (
            <p className="text-sm text-slate-500 mt-1">{subtitulo}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

const campoClasses =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-sky-600 focus:ring-2 focus:ring-sky-100";

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
};

export function CampoTexto({ label, id, className, ...props }: CampoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input id={id} className={twMerge(campoClasses, className)} {...props} />
    </div>
  );
}

export function CampoSenha({ label, id, className, ...props }: CampoProps) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          className={twMerge(campoClasses, "pr-10", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          tabIndex={-1}
        >
          {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export function BotaoEnviar({
  carregando,
  children,
}: {
  carregando: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={carregando}
      className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {carregando && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
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
