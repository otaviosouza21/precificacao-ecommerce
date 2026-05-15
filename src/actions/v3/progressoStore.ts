import { kvDel, kvDisponivel, kvGet, kvSet } from "@/lib/kv/client";

export type ProgressoSync = {
  etapa: string;
  atual: number;
  total: number;
  atualizadoEm: number;
};

const memoria = new Map<string, ProgressoSync>();
const TTL_SEGUNDOS = 60 * 30;

function chaveKv(sessionKey: string): string {
  return `progresso:${sessionKey}`;
}

export async function setProgresso(
  sessionKey: string,
  p: Omit<ProgressoSync, "atualizadoEm">
): Promise<void> {
  const completo: ProgressoSync = { ...p, atualizadoEm: Date.now() };
  memoria.set(sessionKey, completo);
  if (kvDisponivel()) {
    try {
      await kvSet(chaveKv(sessionKey), JSON.stringify(completo), {
        expSegundos: TTL_SEGUNDOS,
      });
    } catch {
      // KV indisponível por instante — fallback em memória já cobre
    }
  }
}

export async function lerProgresso(
  sessionKey: string
): Promise<ProgressoSync | null> {
  if (kvDisponivel()) {
    try {
      const raw = await kvGet(chaveKv(sessionKey));
      if (raw) return JSON.parse(raw) as ProgressoSync;
    } catch {
      // ignore — cai para memória
    }
  }
  return memoria.get(sessionKey) ?? null;
}

export async function limparProgresso(sessionKey: string): Promise<void> {
  memoria.delete(sessionKey);
  if (kvDisponivel()) {
    try {
      await kvDel(chaveKv(sessionKey));
    } catch {
      // ignore
    }
  }
}
