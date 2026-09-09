"use client";

// Consumo da API de Relatórios da Bikeline (vendas Shopee x custo Tiny).
// Rotas protegidas por JWT: exigem Authorization: Bearer <token>.
// O token é o mesmo emitido no login e guardado pelo AuthContext.

import type {
  ParamsVendasCustos,
  RelatorioVendasCustos,
  ResultadoSyncCustos,
  ResultadoSyncVendas,
  StatusRelatorios,
} from "./types";

export const RELATORIOS_API_URL =
  process.env.NEXT_PUBLIC_BIKELINE_API_URL ??
  "https://bikeline-api.onrender.com";

// Mesma chave usada pelo AuthContext para guardar o JWT no sessionStorage.
const TOKEN_KEY = "bkline.access_token";

export class RelatoriosApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RelatoriosApiError";
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

function montarQuery(params: Record<string, unknown> = {}): string {
  const qs = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null || valor === "") continue;
    qs.append(chave, String(valor));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function requisitar<T>(
  caminho: string,
  jwt: string,
  rotuloErro: string,
  metodo: "GET" | "POST" = "GET",
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${RELATORIOS_API_URL}${caminho}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
    });
  } catch {
    throw new RelatoriosApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
    );
  }

  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    throw new RelatoriosApiError(
      401,
      extrairMensagem(body, "Não autenticado — refaça o login."),
    );
  }
  if (!res.ok) {
    throw new RelatoriosApiError(
      res.status,
      extrairMensagem(body, `Erro ${res.status} ao ${rotuloErro}`),
    );
  }

  return body as T;
}

function exigirToken(token: string | null | undefined): string {
  const jwt = token ?? tokenDaSessao();
  if (!jwt) {
    throw new RelatoriosApiError(401, "Não autenticado — refaça o login.");
  }
  return jwt;
}

/** Relatório de vendas x custo médio por SKU no período. */
export async function listarVendasCustos(
  token: string | null | undefined,
  params: ParamsVendasCustos = {},
): Promise<RelatorioVendasCustos> {
  return requisitar<RelatorioVendasCustos>(
    `/relatorios/vendas-custos${montarQuery({ ...params })}`,
    exigirToken(token),
    "gerar o relatório de vendas",
  );
}

/** Estado das sincronizações que alimentam o relatório. */
export async function statusRelatorios(
  token: string | null | undefined,
): Promise<StatusRelatorios> {
  return requisitar<StatusRelatorios>(
    "/relatorios/status",
    exigirToken(token),
    "consultar o status das sincronizações",
  );
}

/** Espelha os pedidos da Shopee. Sem período = incremental (rápido). */
export async function sincronizarVendas(
  token: string | null | undefined,
  params: { de?: string; ate?: string } = {},
): Promise<ResultadoSyncVendas> {
  return requisitar<ResultadoSyncVendas>(
    `/relatorios/vendas/sincronizar${montarQuery(params)}`,
    exigirToken(token),
    "sincronizar as vendas da Shopee",
    "POST",
  );
}

/** Espelha o custo do catálogo do Tiny. */
export async function sincronizarCustos(
  token: string | null | undefined,
): Promise<ResultadoSyncCustos> {
  return requisitar<ResultadoSyncCustos>(
    "/relatorios/custos/sincronizar",
    exigirToken(token),
    "sincronizar os custos do Tiny",
    "POST",
  );
}
