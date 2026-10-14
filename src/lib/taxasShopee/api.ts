"use client";

// Tabela de comissão + taxa fixa da Shopee (banco interno da Bikeline).
// Rotas protegidas por JWT: exigem Authorization: Bearer <token>.

import type { FaixaComissao, TaxasShopee } from "./types";

export const TAXAS_SHOPEE_API_URL =
  process.env.NEXT_PUBLIC_BIKELINE_API_URL ??
  "https://bikeline-api.onrender.com";

export class TaxasShopeeApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "TaxasShopeeApiError";
    this.status = status;
  }
}

function extrairMensagem(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const { message } = body as { message: string | string[] };
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

async function requisitar<T>(
  metodo: "GET" | "PUT",
  jwt: string,
  rotuloErro: string,
  corpo?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${TAXAS_SHOPEE_API_URL}/taxas-shopee`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new TaxasShopeeApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
    );
  }

  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    throw new TaxasShopeeApiError(401, "Não autenticado — refaça o login.");
  }
  if (!res.ok) {
    throw new TaxasShopeeApiError(
      res.status,
      extrairMensagem(body, `Erro ${res.status} ao ${rotuloErro}`),
    );
  }
  return body as T;
}

/** Tabela vigente (ou a padrão, quando nada foi salvo ainda). */
export function obterTaxasShopee(token: string): Promise<TaxasShopee> {
  return requisitar<TaxasShopee>(
    "GET",
    token,
    "carregar as taxas da Shopee",
  );
}

/** Substitui a tabela inteira. Vale para todos os usuários. */
export function salvarTaxasShopee(
  token: string,
  faixas: FaixaComissao[],
): Promise<TaxasShopee> {
  return requisitar<TaxasShopee>("PUT", token, "salvar as taxas da Shopee", {
    // A API rejeita campos desconhecidos — o id é só do front.
    faixas: faixas.map(({ precoMin, precoMax, comissaoPct, taxaFixa }) => ({
      precoMin,
      precoMax,
      comissaoPct,
      taxaFixa,
    })),
  });
}
