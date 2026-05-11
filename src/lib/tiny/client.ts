import { refreshTokens } from "./oauth";
import { delay, throttleTinyV3 } from "./rate-limit";
import { TINY_V3_BASE } from "./endpoints";
import { comLockDeRefresh, getTokenStore } from "./token-store";
import { TinyAuthError, TinyTokens } from "./types";

const MAX_RETRIES = 4;
const ESPERA_RATE_LIMIT_MS = 60_000;
const MARGEM_REFRESH_MS = 60_000;

async function obterTokenValido(): Promise<TinyTokens> {
  const store = getTokenStore();
  let tokens = await store.ler();
  if (!tokens) throw new TinyAuthError("no_tokens");

  const agora = Date.now();
  if (tokens.refreshExpiresAt <= agora) {
    throw new TinyAuthError("refresh_expired");
  }

  if (tokens.accessExpiresAt - agora < MARGEM_REFRESH_MS) {
    tokens = await comLockDeRefresh(async () => {
      const atuais = await store.ler();
      if (!atuais) throw new TinyAuthError("no_tokens");
      if (atuais.accessExpiresAt - Date.now() >= MARGEM_REFRESH_MS) return atuais;
      const novos = await refreshTokens(atuais.refreshToken);
      await store.salvar(novos);
      return novos;
    });
  }
  return tokens;
}

async function refreshReativo(): Promise<TinyTokens> {
  const store = getTokenStore();
  return comLockDeRefresh(async () => {
    const atuais = await store.ler();
    if (!atuais) throw new TinyAuthError("no_tokens");
    const novos = await refreshTokens(atuais.refreshToken);
    await store.salvar(novos);
    return novos;
  });
}

function montarUrl(
  path: string,
  query?: Record<string, string | number | undefined>
): string {
  const url = new URL(TINY_V3_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export type FetchOpts = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

export async function fetchTinyV3<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = montarUrl(path, opts.query);
  let tentativa = 0;
  let jaTentouRefresh = false;
  let ultimoErro: unknown = null;

  while (tentativa <= MAX_RETRIES) {
    const tokens = await obterTokenValido();
    await throttleTinyV3();

    let res: Response;
    try {
      res = await fetch(url, {
        method: opts.method ?? "GET",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          Accept: "application/json",
          ...(opts.body ? { "Content-Type": "application/json" } : {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        cache: "no-store",
      });
    } catch (err) {
      ultimoErro = err;
      tentativa++;
      if (tentativa > MAX_RETRIES) break;
      await delay(1000 * Math.pow(2, tentativa - 1));
      continue;
    }

    if (res.status === 401 && !jaTentouRefresh) {
      jaTentouRefresh = true;
      try {
        await refreshReativo();
      } catch (err) {
        if (err instanceof TinyAuthError) throw err;
        throw new TinyAuthError("refresh_failed", String(err));
      }
      continue;
    }

    if (res.status === 429) {
      const espera =
        tentativa === 0
          ? ESPERA_RATE_LIMIT_MS
          : ESPERA_RATE_LIMIT_MS * Math.pow(2, tentativa - 1);
      await delay(espera);
      tentativa++;
      continue;
    }

    if (res.status >= 500) {
      tentativa++;
      ultimoErro = new Error(`HTTP ${res.status}`);
      if (tentativa > MAX_RETRIES) break;
      await delay(1000 * Math.pow(2, tentativa - 1));
      continue;
    }

    if (!res.ok) {
      let texto = "";
      try {
        texto = await res.text();
      } catch {}
      throw new Error(`Tiny V3 ${res.status} em ${path}: ${texto}`);
    }

    if (res.status === 204) return undefined as T;
    try {
      return (await res.json()) as T;
    } catch (err) {
      throw new Error(`Resposta inválida do Tiny em ${path}: ${err}`);
    }
  }

  throw ultimoErro instanceof Error
    ? ultimoErro
    : new Error(`Falha ao consultar ${path}`);
}
