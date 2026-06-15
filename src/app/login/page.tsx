"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  AuthCard,
  BotaoEnviar,
  CampoSenha,
  CampoTexto,
  MensagemErro,
} from "@/components/Auth/AuthUi";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const usuario = await login(email, senha);
      router.replace(usuario.primeiroAcesso ? "/trocar-senha" : "/");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao realizar login");
      setEnviando(false);
    }
  }

  return (
    <AuthCard
      titulo="Entrar"
      subtitulo="Acesse o sistema com seu e-mail e senha."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CampoTexto
          label="E-mail"
          id="email"
          type="email"
          placeholder="seu@email.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <CampoSenha
          label="Senha"
          id="senha"
          placeholder="Sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
        />
        <MensagemErro mensagem={erro} />
        <BotaoEnviar carregando={enviando}>Entrar</BotaoEnviar>
        <Link
          href="/esqueci-senha"
          className="text-sm text-sky-700 hover:text-sky-900 hover:underline text-center"
        >
          Esqueci minha senha
        </Link>
      </form>
    </AuthCard>
  );
}
