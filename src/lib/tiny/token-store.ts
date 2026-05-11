import { promises as fs } from "fs";
import path from "path";
import { TinyTokens } from "./types";

export interface TokenStore {
  ler(): Promise<TinyTokens | null>;
  salvar(t: TinyTokens): Promise<void>;
  apagar(): Promise<void>;
}

class FileTokenStore implements TokenStore {
  private caminho: string;
  constructor(caminho: string) {
    this.caminho = path.isAbsolute(caminho)
      ? caminho
      : path.resolve(process.cwd(), caminho);
  }
  async ler(): Promise<TinyTokens | null> {
    try {
      const raw = await fs.readFile(this.caminho, "utf-8");
      return JSON.parse(raw) as TinyTokens;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }
  async salvar(t: TinyTokens): Promise<void> {
    const tmp = `${this.caminho}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(t, null, 2), "utf-8");
    await fs.rename(tmp, this.caminho);
  }
  async apagar(): Promise<void> {
    try {
      await fs.unlink(this.caminho);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}

class KvTokenStore implements TokenStore {
  private url: string;
  private token: string;
  private chave: string;
  constructor(url: string, token: string, chave = "tiny:tokens") {
    this.url = url.replace(/\/$/, "");
    this.token = token;
    this.chave = chave;
  }
  private async req(
    pathParts: string[],
    body?: unknown
  ): Promise<unknown> {
    const path = pathParts.map(encodeURIComponent).join("/");
    const res = await fetch(`${this.url}/${path}`, {
      method: body !== undefined ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`KV ${res.status}: ${await res.text()}`);
    return res.json();
  }
  async ler(): Promise<TinyTokens | null> {
    const r = (await this.req(["get", this.chave])) as { result?: string | null };
    if (!r?.result) return null;
    try {
      return JSON.parse(r.result) as TinyTokens;
    } catch {
      return null;
    }
  }
  async salvar(t: TinyTokens): Promise<void> {
    await this.req(["set", this.chave], JSON.stringify(t));
  }
  async apagar(): Promise<void> {
    await this.req(["del", this.chave]);
  }
}

let storeSingleton: TokenStore | null = null;

function resolverCredenciaisKv(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.BIKELINE_KV_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.BIKELINE_KV_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export function getTokenStore(): TokenStore {
  if (storeSingleton) return storeSingleton;
  const modo = (process.env.TINY_TOKEN_STORE || "kv").toLowerCase();
  if (modo === "file") {
    const arquivo = process.env.TINY_TOKENS_FILE || "./.tiny-tokens.json";
    storeSingleton = new FileTokenStore(arquivo);
    return storeSingleton;
  }
  const cred = resolverCredenciaisKv();
  if (!cred) {
    const arquivo = process.env.TINY_TOKENS_FILE || "./.tiny-tokens.json";
    storeSingleton = new FileTokenStore(arquivo);
    return storeSingleton;
  }
  storeSingleton = new KvTokenStore(cred.url, cred.token);
  return storeSingleton;
}

let refreshAtual: Promise<TinyTokens> | null = null;

export async function comLockDeRefresh(
  fn: () => Promise<TinyTokens>
): Promise<TinyTokens> {
  if (refreshAtual) return refreshAtual;
  refreshAtual = (async () => {
    try {
      return await fn();
    } finally {
      refreshAtual = null;
    }
  })();
  return refreshAtual;
}
