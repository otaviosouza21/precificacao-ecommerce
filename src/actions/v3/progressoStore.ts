export type ProgressoSync = {
  etapa: string;
  atual: number;
  total: number;
  atualizadoEm: number;
};

const mapa = new Map<string, ProgressoSync>();

export function setProgresso(sessionKey: string, p: Omit<ProgressoSync, "atualizadoEm">) {
  mapa.set(sessionKey, { ...p, atualizadoEm: Date.now() });
}

export function lerProgresso(sessionKey: string): ProgressoSync | null {
  return mapa.get(sessionKey) ?? null;
}

export function limparProgresso(sessionKey: string) {
  mapa.delete(sessionKey);
}
