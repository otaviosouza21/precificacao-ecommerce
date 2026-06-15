"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  AuthCard,
  BotaoEnviar,
  CampoTexto,
  MensagemErro,
} from "@/components/Auth/AuthUi";
import { esqueciSenha } from "@/lib/auth/api";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  // Provisório: a API ainda retorna o token na resposta (sem serviço de e-mail)
  const [resetToken, setResetToken] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await esqueciSenha(email);
      setMensagem(resposta.mensagem);
      setResetToken(resposta.resetToken ?? null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao solicitar recuperação");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthCard
      titulo="Esqueci minha senha"
      subtitulo="Informe seu e-mail para receber as instruções de recuperação."
    >
      {mensagem ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
            {mensagem}
          </p>
          {resetToken && (
            <Link
              href={`/redefinir-senha?token=${encodeURIComponent(resetToken)}`}
              className="w-full text-center rounded-lg bg-sky-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800"
            >
              Redefinir senha agora
            </Link>
          )}
          <Link
            href="/login"
            className="text-sm text-sky-700 hover:text-sky-900 hover:underline text-center"
          >
            Voltar ao login
          </Link>
        </div>
      ) : (
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
          <MensagemErro mensagem={erro} />
          <BotaoEnviar carregando={enviando}>Enviar</BotaoEnviar>
          <Link
            href="/login"
            className="text-sm text-sky-700 hover:text-sky-900 hover:underline text-center"
          >
            Voltar ao login
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
