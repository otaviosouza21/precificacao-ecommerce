"use client";

// Consumo da API Financeiro (Renda Shopee) da Bikeline.
// Rotas protegidas por JWT: exigem Authorization: Bearer <token>.
// O token é o mesmo emitido no login e guardado pelo AuthContext.

import type {
  DetalheRenda,
  ListarRendaParams,
  RendaResponse,
} from "./types";

export const FINANCEIRO_API_URL =
  process.env.NEXT_PUBLIC_BIKELINE_API_URL ??
  "https://bikeline-api.onrender.com";

// Mesma chave usada pelo AuthContext para guardar o JWT no sessionStorage.
const TOKEN_KEY = "bkline.access_token";

export class FinanceiroApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "FinanceiroApiError";
    this.status = status;
  }
}

// O NestJS retorna `message` como string ou array de strings (validação).
function extrairMensagem(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const { message } = body as { message: string | string[] };
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

// Lê o token salvo na sessão (fallback quando não é passado explicitamente).
function tokenDaSessao(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function montarQuery(params: ListarRendaParams = {}): string {
  const qs = new URLSearchParams();
  if (params.de) qs.append("de", params.de);
  if (params.ate) qs.append("ate", params.ate);
  if (params.pedido) qs.append("pedido", params.pedido);
  if (params.cliente) qs.append("cliente", params.cliente);
  if (params.fluxo) qs.append("fluxo", params.fluxo);
  if (params.tipo) qs.append("tipo", params.tipo);
  if (params.valorMin != null) qs.append("valorMin", String(params.valorMin));
  if (params.valorMax != null) qs.append("valorMax", String(params.valorMax));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function requisitar<T>(
  caminho: string,
  jwt: string,
  rotuloErro: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${FINANCEIRO_API_URL}${caminho}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
    });
  } catch {
    throw new FinanceiroApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
    );
  }

  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    throw new FinanceiroApiError(401, "Não autenticado — refaça o login.");
  }
  if (!res.ok) {
    throw new FinanceiroApiError(
      res.status,
      extrairMensagem(body, `Erro ${res.status} ao ${rotuloErro}`),
    );
  }

  return body as T;
}

/**
 * Lista a renda recebida da loja na Shopee no período (filtro por data de
 * recebimento). Sem datas, a API retorna os últimos 14 dias.
 *
 * @param token JWT. Se omitido, usa o token guardado no sessionStorage.
 */
export async function listarRenda(
  token: string | null | undefined,
  params: ListarRendaParams = {},
): Promise<RendaResponse> {
  const jwt = token ?? tokenDaSessao();
  if (!jwt) {
    throw new FinanceiroApiError(401, "Não autenticado — refaça o login.");
  }
  return requisitar<RendaResponse>(
    `/financeiro/renda${montarQuery(params)}`,
    jwt,
    "consultar renda",
  );
}

/**
 * Detalha a composição financeira de um pedido (taxas, descontos e líquido).
 *
 * @param token JWT. Se omitido, usa o token guardado no sessionStorage.
 */
export async function detalharRenda(
  token: string | null | undefined,
  orderSn: string,
): Promise<DetalheRenda> {
  const jwt = token ?? tokenDaSessao();
  if (!jwt) {
    throw new FinanceiroApiError(401, "Não autenticado — refaça o login.");
  }
  return requisitar<DetalheRenda>(
    `/financeiro/renda/${encodeURIComponent(orderSn)}`,
    jwt,
    "detalhar pedido",
  );
}

/**
 * Detalha vários pedidos com concorrência limitada (a rota da Shopee pode ser
 * lenta). Erros por pedido são tolerados: o pedido sai em `falhas` e o cálculo
 * cai no valor do título, espelhando o comportamento da v1 com o Tiny.
 */
export async function detalharVariosPedidos(
  token: string | null | undefined,
  pedidos: string[],
  opcoes: {
    concorrencia?: number;
    onProgress?: (concluidos: number, total: number) => void;
  } = {},
): Promise<{
  detalhes: Map<string, DetalheRenda>;
  falhas: string[];
}> {
  const { concorrencia = 5, onProgress } = opcoes;
  const detalhes = new Map<string, DetalheRenda>();
  const falhas: string[] = [];

  const fila = [...new Set(pedidos.filter(Boolean))];
  const total = fila.length;
  let concluidos = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < fila.length) {
      const orderSn = fila[cursor++];
      try {
        detalhes.set(orderSn, await detalharRenda(token, orderSn));
      } catch {
        falhas.push(orderSn);
      } finally {
        concluidos++;
        onProgress?.(concluidos, total);
      }
    }
  }

  const trabalhadores = Array.from(
    { length: Math.min(concorrencia, fila.length) },
    () => worker(),
  );
  await Promise.all(trabalhadores);

  return { detalhes, falhas };
}
