"use client";

// Consumo dos preços base dos anúncios (Shopee → banco interno da Bikeline).
// Rotas protegidas por JWT: exigem Authorization: Bearer <token>.

export const ANUNCIOS_API_URL =
  process.env.NEXT_PUBLIC_BIKELINE_API_URL ??
  "https://bikeline-api.onrender.com";

const TOKEN_KEY = "bkline.access_token";

export class AnunciosApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AnunciosApiError";
    this.status = status;
  }
}

export interface PrecoAnuncio {
  sku: string;
  precoOriginal: number | null;
  precoAtual: number | null;
  sincronizadoEm: string;
}

export interface PrecosAnunciosResponse {
  itens: PrecoAnuncio[];
  total: number;
  sincronizadoEm: string | null;
}

export interface SincronizarPrecosResponse {
  total: number;
  sincronizadoEm: string;
}

// Linha do painel de gestão: preço ao vivo da Shopee × referência do banco.
export interface ItemGestaoAnuncio {
  itemId: string;
  modelId: number;
  sku: string;
  nome: string;
  variacao: string;
  status: string;
  shopeeOriginal: number | null;
  shopeeAtual: number | null;
  refOriginal: number | null;
  refAtual: number | null;
  refSincronizadoEm: string | null;
  diverge: boolean;
}

export interface GestaoAnunciosResponse {
  itens: ItemGestaoAnuncio[];
  total: number;
  geradoEm: string;
}

function extrairMensagem(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const { message } = body as { message: string | string[] };
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

function tokenDaSessao(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

async function requisitar<T>(
  caminho: string,
  metodo: "GET" | "POST" | "PATCH",
  jwt: string,
  rotuloErro: string,
  corpo?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${ANUNCIOS_API_URL}${caminho}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new AnunciosApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
    );
  }

  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    throw new AnunciosApiError(401, "Não autenticado — refaça o login.");
  }
  if (!res.ok) {
    throw new AnunciosApiError(
      res.status,
      extrairMensagem(body, `Erro ${res.status} ao ${rotuloErro}`),
    );
  }
  return body as T;
}

/**
 * Lê os preços base já sincronizados no nosso banco. Sem `skus`, traz todos
 * (a tabela é pequena — algumas centenas de anúncios).
 *
 * @param token JWT. Se omitido, usa o token guardado no sessionStorage.
 */
export async function listarPrecosAnuncios(
  token?: string | null,
  skus?: string[],
): Promise<PrecosAnunciosResponse> {
  const jwt = token ?? tokenDaSessao();
  if (!jwt) throw new AnunciosApiError(401, "Não autenticado — refaça o login.");
  const qs =
    skus && skus.length ? `?skus=${encodeURIComponent(skus.join(","))}` : "";
  return requisitar<PrecosAnunciosResponse>(
    `/anuncios/precos${qs}`,
    "GET",
    jwt,
    "consultar preços dos anúncios",
  );
}

/**
 * Painel de gestão: preço AO VIVO da Shopee (por variação) × referência do
 * banco. Faz um fetch ao vivo na Shopee — pode demorar (dezenas de segundos).
 *
 * @param token JWT. Se omitido, usa o token guardado no sessionStorage.
 */
export async function gestaoAnuncios(
  token?: string | null,
): Promise<GestaoAnunciosResponse> {
  const jwt = token ?? tokenDaSessao();
  if (!jwt) throw new AnunciosApiError(401, "Não autenticado — refaça o login.");
  return requisitar<GestaoAnunciosResponse>(
    `/anuncios/gestao`,
    "GET",
    jwt,
    "carregar a gestão de anúncios",
  );
}

export interface AtualizarPrecoInput {
  precoAtual: number;
  precoOriginal?: number;
  itemId?: string;
  nome?: string;
}

/**
 * Atualiza MANUALMENTE a referência (nosso banco) de um SKU. Não altera o
 * anúncio na Shopee — só o nosso registro interno.
 *
 * @param token JWT. Se omitido, usa o token guardado no sessionStorage.
 */
export async function atualizarPrecoAnuncio(
  token: string | null | undefined,
  sku: string,
  dados: AtualizarPrecoInput,
): Promise<PrecoAnuncio> {
  const jwt = token ?? tokenDaSessao();
  if (!jwt) throw new AnunciosApiError(401, "Não autenticado — refaça o login.");
  return requisitar<PrecoAnuncio>(
    `/anuncios/precos/${encodeURIComponent(sku)}`,
    "PATCH",
    jwt,
    "atualizar o preço de referência",
    dados,
  );
}

/**
 * Dispara a sincronização dos preços dos anúncios (Shopee → banco). Pode
 * demorar alguns segundos (varre todos os anúncios).
 *
 * @param token JWT. Se omitido, usa o token guardado no sessionStorage.
 */
export async function sincronizarPrecosAnuncios(
  token?: string | null,
): Promise<SincronizarPrecosResponse> {
  const jwt = token ?? tokenDaSessao();
  if (!jwt) throw new AnunciosApiError(401, "Não autenticado — refaça o login.");
  return requisitar<SincronizarPrecosResponse>(
    `/anuncios/precos/sincronizar`,
    "POST",
    jwt,
    "sincronizar preços dos anúncios",
  );
}
