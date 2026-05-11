import { TinyAuthError, TinyTokenResponse, TinyTokens } from "./types";

export const AUTH_URL =
  "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth";
export const TOKEN_URL =
  "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/token";

function envObrig(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`Variável de ambiente ${nome} não definida`);
  return v;
}

export function urlDeAutorizacao(state: string): string {
  const clientId = envObrig("TINY_CLIENT_ID");
  const redirect = envObrig("TINY_REDIRECT_URI");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

function tokenResponseParaTokens(r: TinyTokenResponse): TinyTokens {
  const agora = Date.now();
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    accessExpiresAt: agora + r.expires_in * 1000,
    refreshExpiresAt: agora + r.refresh_expires_in * 1000,
    scope: r.scope,
    tokenType: "Bearer",
    obtidoEm: agora,
  };
}

async function postTokenEndpoint(body: URLSearchParams): Promise<TinyTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    let texto = "";
    try {
      texto = await res.text();
    } catch {}
    const lower = texto.toLowerCase();
    if (lower.includes("invalid_grant") || lower.includes("token expired")) {
      throw new TinyAuthError(
        "refresh_expired",
        `OAuth ${res.status}: ${texto}`
      );
    }
    throw new TinyAuthError("refresh_failed", `OAuth ${res.status}: ${texto}`);
  }
  const json = (await res.json()) as TinyTokenResponse;
  return tokenResponseParaTokens(json);
}

export async function trocarCodePorTokens(code: string): Promise<TinyTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: envObrig("TINY_CLIENT_ID"),
    client_secret: envObrig("TINY_CLIENT_SECRET"),
    redirect_uri: envObrig("TINY_REDIRECT_URI"),
    code,
  });
  return postTokenEndpoint(body);
}

export async function refreshTokens(refreshToken: string): Promise<TinyTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: envObrig("TINY_CLIENT_ID"),
    client_secret: envObrig("TINY_CLIENT_SECRET"),
    refresh_token: refreshToken,
  });
  return postTokenEndpoint(body);
}
