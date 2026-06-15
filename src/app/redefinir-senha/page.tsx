"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { toast } from "react-toastify";
import {
  AuthCard,
  BotaoEnviar,
  CampoSenha,
  CampoTexto,
  MensagemErro,
} from "@/components/Auth/AuthUi";
import { redefinirSenha } from "@/lib/auth/api";

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <RedefinirSenhaForm />
    </Suspense>
  );
}

function RedefinirSenhaForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenDaUrl = searchParams.get("token") ?? "";
  const [token, setToken] = useState(tokenDaUrl);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (novaSenha.length < 8) {
      setErro("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }

    setEnviando(true);
    try {
      await redefinirSenha(token, novaSenha);
      toast.success("Senha redefinida com sucesso! Faça login.");
      router.replace("/login");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao redefinir a senha");
      setEnviando(false);
    }
  }

  return (
    <AuthCard
      titulo="Redefinir senha"
      subtitulo="Defina uma nova senha para sua conta."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!tokenDaUrl && (
          <CampoTexto
            label="Token de recuperação"
            id="token"
            type="text"
            placeholder="Cole aqui o token recebido"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        )}
        <CampoSenha
          label="Nova senha"
          id="novaSenha"
          placeholder="Mínimo 8 caracteres"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          autoComplete="new-password"
          required
        />
        <CampoSenha
          label="Confirmar nova senha"
          id="confirmacao"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          autoComplete="new-password"
          required
        />
        <MensagemErro mensagem={erro} />
        <BotaoEnviar carregando={enviando}>Redefinir senha</BotaoEnviar>
        <Link
          href="/login"
          className="text-sm text-sky-700 hover:text-sky-900 hover:underline text-center"
        >
          Voltar ao login
        </Link>
      </form>
    </AuthCard>
  );
}
