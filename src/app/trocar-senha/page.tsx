"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "react-toastify";
import {
  AuthCard,
  BotaoEnviar,
  CampoSenha,
  MensagemErro,
} from "@/components/Auth/AuthUi";
import { useAuth } from "@/contexts/AuthContext";
import { trocarSenha } from "@/lib/auth/api";

export default function TrocarSenhaPage() {
  const { usuario, token, logout, atualizarUsuario } = useAuth();
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const primeiroAcesso = usuario?.primeiroAcesso ?? false;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);

    if (novaSenha.length < 8) {
      setErro("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (novaSenha === senhaAtual) {
      setErro("A nova senha deve ser diferente da senha atual.");
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    if (!token) {
      router.replace("/login");
      return;
    }

    setEnviando(true);
    try {
      await trocarSenha(token, senhaAtual, novaSenha);
      atualizarUsuario({ primeiroAcesso: false });
      toast.success("Senha alterada com sucesso!");
      router.replace("/");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao trocar a senha");
      setEnviando(false);
    }
  }

  return (
    <AuthCard
      titulo={primeiroAcesso ? "Defina sua nova senha" : "Trocar senha"}
      subtitulo={
        primeiroAcesso
          ? "Este é seu primeiro acesso. Por segurança, defina uma nova senha antes de continuar."
          : "Informe sua senha atual e a nova senha."
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CampoSenha
          label={primeiroAcesso ? "Senha temporária" : "Senha atual"}
          id="senhaAtual"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          autoComplete="current-password"
          required
        />
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
        <BotaoEnviar carregando={enviando}>Salvar nova senha</BotaoEnviar>
        <button
          type="button"
          onClick={() => {
            if (primeiroAcesso) {
              logout();
              router.replace("/login");
            } else {
              router.replace("/");
            }
          }}
          className="text-sm text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
        >
          {primeiroAcesso ? "Sair e voltar ao login" : "Cancelar"}
        </button>
      </form>
    </AuthCard>
  );
}
