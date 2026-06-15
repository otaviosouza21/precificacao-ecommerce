"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { login as loginApi, obterPerfil } from "@/lib/auth/api";
import type { Usuario } from "@/lib/auth/types";

const TOKEN_KEY = "bkline.access_token";

type AuthContextValue = {
  usuario: Usuario | null;
  token: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<Usuario>;
  logout: () => void;
  atualizarUsuario: (dados: Partial<Usuario>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Restaura a sessão ao recarregar a página
  useEffect(() => {
    const salvo = sessionStorage.getItem(TOKEN_KEY);
    if (!salvo) {
      setCarregando(false);
      return;
    }
    obterPerfil(salvo)
      .then((perfil) => {
        setToken(salvo);
        setUsuario(perfil);
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setCarregando(false));
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const { access_token, usuario: dados } = await loginApi(email, senha);
    sessionStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
    setUsuario(dados);
    return dados;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUsuario(null);
  }, []);

  const atualizarUsuario = useCallback((dados: Partial<Usuario>) => {
    setUsuario((atual) => (atual ? { ...atual, ...dados } : atual));
  }, []);

  return (
    <AuthContext.Provider
      value={{ usuario, token, carregando, login, logout, atualizarUsuario }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return contexto;
}
