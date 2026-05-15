export type KvCredenciais = { url: string; token: string };

export function resolverCredenciaisKv(): KvCredenciais | null {
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
  return { url: url.replace(/\/$/, ""), token };
}

async function req(
  cred: KvCredenciais,
  pathParts: string[],
  body?: unknown
): Promise<unknown> {
  const path = pathParts.map(encodeURIComponent).join("/");
  const res = await fetch(`${cred.url}/${path}`, {
    method: body !== undefined ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${cred.token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function kvGet(chave: string): Promise<string | null> {
  const cred = resolverCredenciaisKv();
  if (!cred) return null;
  const r = (await req(cred, ["get", chave])) as { result?: string | null };
  return r?.result ?? null;
}

export async function kvSet(
  chave: string,
  valor: string,
  opcoes?: { expSegundos?: number }
): Promise<void> {
  const cred = resolverCredenciaisKv();
  if (!cred) return;
  if (opcoes?.expSegundos) {
    await req(cred, ["set", chave, "EX", String(opcoes.expSegundos)], valor);
  } else {
    await req(cred, ["set", chave], valor);
  }
}

export async function kvDel(chave: string): Promise<void> {
  const cred = resolverCredenciaisKv();
  if (!cred) return;
  await req(cred, ["del", chave]);
}

export function kvDisponivel(): boolean {
  return resolverCredenciaisKv() !== null;
}
