"use client";

import { AlertCircle, CheckCircle2, LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { StatusAuth } from "@/lib/tiny/types";

type Props = {
  onMudouStatus?: (s: StatusAuth) => void;
};

function formataDuracao(ms: number): string {
  if (ms <= 0) return "expirado";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export default function StatusAutenticacaoTiny({ onMudouStatus }: Props) {
  const [status, setStatus] = useState<StatusAuth | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function buscar() {
    try {
      const res = await fetch("/api/tiny/auth/status", { cache: "no-store" });
      const j = (await res.json()) as StatusAuth;
      setStatus(j);
      onMudouStatus?.(j);
    } catch {
      setStatus({ connected: false, reason: "no_tokens" });
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    buscar();
    const i = setInterval(buscar, 60_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function desconectar() {
    await fetch("/api/tiny/auth/logout", { method: "POST" });
    buscar();
  }

  if (carregando) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-xs text-sky-300">
        Verificando conexão com o Tiny…
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="bg-gradient-to-br from-red-900/40 to-red-800/30 border border-red-700/40 rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-red-200">
          <AlertCircle className="w-4 h-4" />
          {status?.reason === "refresh_expired"
            ? "Sessão Tiny expirada — reconecte para continuar."
            : "Não conectado ao Tiny."}
        </div>
        <a
          href="/api/tiny/auth/login"
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white"
        >
          <LogIn className="w-4 h-4" />
          Conectar Tiny
        </a>
      </div>
    );
  }

  const restante = status.precisaRelogarEm;
  const alerta = restante < 2 * 60 * 60 * 1000;

  return (
    <div
      className={`border rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 ${
        alerta
          ? "bg-amber-900/30 border-amber-700/40"
          : "bg-emerald-900/30 border-emerald-700/40"
      }`}
    >
      <div className="flex items-center gap-2 text-xs">
        <CheckCircle2
          className={`w-4 h-4 ${alerta ? "text-amber-300" : "text-emerald-300"}`}
        />
        <span className={alerta ? "text-amber-200" : "text-emerald-200"}>
          Conectado ao Tiny · access expira em{" "}
          {formataDuracao(status.accessExpiresAt - Date.now())} · sessão expira em{" "}
          {formataDuracao(restante)}
          {alerta && " — reconecte logo"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {alerta && (
          <a
            href="/api/tiny/auth/login"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-700/70 hover:bg-amber-600/80 text-white"
          >
            <LogIn className="w-3.5 h-3.5" />
            Reconectar
          </a>
        )}
        <button
          onClick={desconectar}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sky-100 border border-white/10"
        >
          <LogOut className="w-3.5 h-3.5" />
          Desconectar
        </button>
      </div>
    </div>
  );
}
