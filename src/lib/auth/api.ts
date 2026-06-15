import type {
  EsqueciSenhaResponse,
  LoginResponse,
  Usuario,
} from "./types";

export const AUTH_API_URL =
  process.env.NEXT_PUBLIC_BIKELINE_API_URL ??
  "https://bikeline-api.onrender.com";

export class AuthApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

// O NestJS retorna `message` como string ou array de strings (validação)
function extrairMensagem(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const { message } = body as { message: string | string[] };
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

async function requisicao<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${AUTH_API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new AuthApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
    );
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new AuthApiError(
      res.status,
      extrairMensagem(body, "Erro inesperado ao comunicar com a API"),
    );
  }

  return body as T;
}

function comToken(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function login(email: string, senha: string) {
  return requisicao<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });
}

export function obterPerfil(token: string) {
  return requisicao<Usuario>("/auth/perfil", {
    headers: comToken(token),
  });
}

export function trocarSenha(
  token: string,
  senhaAtual: string,
  novaSenha: string,
) {
  return requisicao<{ mensagem: string }>("/auth/trocar-senha", {
    method: "PATCH",
    headers: comToken(token),
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}

export function esqueciSenha(email: string) {
  return requisicao<EsqueciSenhaResponse>("/auth/esqueci-senha", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function redefinirSenha(token: string, novaSenha: string) {
  return requisicao<{ mensagem: string }>("/auth/redefinir-senha", {
    method: "POST",
    body: JSON.stringify({ token, novaSenha }),
  });
}
