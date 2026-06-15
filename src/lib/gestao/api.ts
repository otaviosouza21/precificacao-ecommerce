import { AUTH_API_URL, AuthApiError } from "@/lib/auth/api";
import type {
  AtualizarEmpresaInput,
  AtualizarUsuarioInput,
  CriarEmpresaInput,
  CriarUsuarioInput,
  Empresa,
  UsuarioGestao,
} from "./types";

// O NestJS retorna `message` como string ou array de strings (validação)
function extrairMensagem(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const { message } = body as { message: string | string[] };
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

async function req<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new AuthApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new AuthApiError(
      res.status,
      extrairMensagem(body, "Erro inesperado ao comunicar com a API"),
    );
  }

  return body as T;
}

// ---- Empresas ----

export function listarEmpresas(token: string) {
  return req<Empresa[]>(token, "/empresa");
}

export function criarEmpresa(token: string, dados: CriarEmpresaInput) {
  return req<Empresa>(token, "/empresa", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function atualizarEmpresa(
  token: string,
  id: number,
  dados: AtualizarEmpresaInput,
) {
  return req<Empresa>(token, `/empresa/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

export function desativarEmpresa(token: string, id: number) {
  return req<Empresa>(token, `/empresa/${id}`, { method: "DELETE" });
}

// ---- Usuários ----

export function listarUsuarios(token: string) {
  return req<UsuarioGestao[]>(token, "/usuario");
}

export function criarUsuario(token: string, dados: CriarUsuarioInput) {
  return req<UsuarioGestao>(token, "/usuario", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export function atualizarUsuario(
  token: string,
  id: number,
  dados: AtualizarUsuarioInput,
) {
  return req<UsuarioGestao>(token, `/usuario/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
}

export function desativarUsuario(token: string, id: number) {
  return req<UsuarioGestao>(token, `/usuario/${id}`, { method: "DELETE" });
}
