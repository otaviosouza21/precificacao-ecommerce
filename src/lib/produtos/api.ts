"use client";

// Consumo da API de Produtos da Bikeline (dados do Tiny ERP).
// Rota protegida por JWT: exige Authorization: Bearer <token>.
// O token é o mesmo emitido no login e guardado pelo AuthContext.

import type {
  ListarProdutosParams,
  ListarProdutosResponse,
  Produto,
} from "./types";

export const PRODUTOS_API_URL =
  process.env.NEXT_PUBLIC_BIKELINE_API_URL ??
  "https://bikeline-api.onrender.com";

// Mesma chave usada pelo AuthContext para guardar o JWT no sessionStorage.
const TOKEN_KEY = "bkline.access_token";

export class ProdutosApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ProdutosApiError";
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

function montarQuery(params: ListarProdutosParams = {}): string {
  const qs = new URLSearchParams();
  if (params.nome) qs.append("nome", params.nome);
  if (params.codigo) qs.append("codigo", params.codigo);
  if (params.gtin) qs.append("gtin", params.gtin);
  if (params.situacao) qs.append("situacao", params.situacao);
  if (params.idListaPreco != null)
    qs.append("idListaPreco", String(params.idListaPreco));
  if (params.limit != null) qs.append("limit", String(params.limit));
  if (params.offset != null) qs.append("offset", String(params.offset));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Lista os produtos da Bikeline com preço base e preço em cada tabela.
 *
 * Sem `params.limit`, o backend pagina internamente e devolve TODOS os
 * produtos (pode demorar em catálogos grandes). Para telas paginadas,
 * passe `limit` + `offset`.
 *
 * @param token JWT. Se omitido, usa o token guardado no sessionStorage.
 */
export async function listarProdutos(
  token?: string | null,
  params: ListarProdutosParams = {},
): Promise<ListarProdutosResponse> {
  const jwt = token ?? tokenDaSessao();
  if (!jwt) {
    throw new ProdutosApiError(401, "Não autenticado — refaça o login.");
  }

  let res: Response;
  try {
    res = await fetch(`${PRODUTOS_API_URL}/produtos${montarQuery(params)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
    });
  } catch {
    throw new ProdutosApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
    );
  }

  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    throw new ProdutosApiError(401, "Não autenticado — refaça o login.");
  }
  if (!res.ok) {
    throw new ProdutosApiError(
      res.status,
      extrairMensagem(body, `Erro ${res.status} ao listar produtos`),
    );
  }

  return body as ListarProdutosResponse;
}

// Preço normal de um produto numa tabela específica (null se não houver).
export function precoNaTabela(
  produto: Produto,
  idTabela: number,
): number | null {
  return produto.tabelas.find((t) => t.idTabela === idTabela)?.preco ?? null;
}

// Preço promocional de um produto numa tabela específica.
export function precoPromocionalNaTabela(
  produto: Produto,
  idTabela: number,
): number | null {
  return (
    produto.tabelas.find((t) => t.idTabela === idTabela)?.precoPromocional ??
    null
  );
}
