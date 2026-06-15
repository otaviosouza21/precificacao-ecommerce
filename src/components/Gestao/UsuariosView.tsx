"use client";

import { Ban, CheckCircle2, Pencil, Plus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthApiError } from "@/lib/auth/api";
import type { Role } from "@/lib/auth/types";
import {
  atualizarUsuario,
  criarUsuario,
  desativarUsuario,
  listarEmpresas,
  listarUsuarios,
} from "@/lib/gestao/api";
import { formatarData } from "@/lib/gestao/format";
import type { Empresa, UsuarioGestao } from "@/lib/gestao/types";
import {
  Badge,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  CampoSelect,
  EstadoCarregando,
  EstadoVazio,
  MensagemErro,
  Modal,
  PageHeader,
} from "./ui";

const ROTULO_ROLE: Record<Role, string> = {
  ADMINISTRADOR: "Administrador",
  MASTER: "Master",
  USUARIO: "Usuário",
};

type Rascunho = {
  nome: string;
  email: string;
  senha: string;
  role: Role;
  empresaId: number | "";
};

export default function UsuariosView() {
  const { token, usuario: logado, logout } = useAuth();
  const router = useRouter();

  const ehAdmin = logado?.role === "ADMINISTRADOR";
  const rolesDisponiveis: Role[] = ehAdmin
    ? ["ADMINISTRADOR", "MASTER", "USUARIO"]
    : ["MASTER", "USUARIO"];

  const [usuarios, setUsuarios] = useState<UsuarioGestao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<UsuarioGestao | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [alterandoId, setAlterandoId] = useState<number | null>(null);

  const tratarErroAuth = useCallback(
    (e: unknown): string => {
      if (e instanceof AuthApiError) {
        if (e.status === 401) {
          logout();
          router.replace("/login");
        }
        return e.message;
      }
      return "Erro inesperado";
    },
    [logout, router],
  );

  const carregar = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    setErroLista(null);
    try {
      const lista = await listarUsuarios(token);
      setUsuarios(lista);
      // Só ADMINISTRADOR pode listar empresas para o seletor
      if (ehAdmin) {
        setEmpresas(await listarEmpresas(token));
      }
    } catch (e) {
      setErroLista(tratarErroAuth(e));
    } finally {
      setCarregando(false);
    }
  }, [token, ehAdmin, tratarErroAuth]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const empresaPadrao = (): number | "" => {
    if (ehAdmin) return empresas.find((e) => e.ativo)?.id ?? "";
    return logado?.empresa?.id ?? "";
  };

  function abrirCriacao() {
    setEditando(null);
    setRascunho({
      nome: "",
      email: "",
      senha: "",
      role: "USUARIO",
      empresaId: empresaPadrao(),
    });
    setErroForm(null);
    setModalAberto(true);
  }

  function abrirEdicao(u: UsuarioGestao) {
    setEditando(u);
    setRascunho({
      nome: u.nome,
      email: u.email,
      senha: "",
      role: u.role,
      empresaId: u.empresaId,
    });
    setErroForm(null);
    setModalAberto(true);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!token || !rascunho) return;
    setErroForm(null);

    if (rascunho.empresaId === "") {
      setErroForm("Selecione a empresa.");
      return;
    }
    if (!editando && rascunho.senha.length < 8) {
      setErroForm("A senha temporária deve ter no mínimo 8 caracteres.");
      return;
    }

    setSalvando(true);
    try {
      if (editando) {
        await atualizarUsuario(token, editando.id, {
          nome: rascunho.nome,
          email: rascunho.email,
          role: rascunho.role,
          empresaId: rascunho.empresaId,
        });
      } else {
        await criarUsuario(token, {
          nome: rascunho.nome,
          email: rascunho.email,
          senha: rascunho.senha,
          role: rascunho.role,
          empresaId: rascunho.empresaId,
        });
      }
      setModalAberto(false);
      await carregar();
    } catch (e) {
      setErroForm(tratarErroAuth(e));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(u: UsuarioGestao) {
    if (!token) return;
    const acao = u.ativo ? "desativar" : "reativar";
    if (!window.confirm(`Deseja ${acao} o usuário "${u.nome}"?`)) return;

    setAlterandoId(u.id);
    try {
      if (u.ativo) {
        await desativarUsuario(token, u.id);
      } else {
        await atualizarUsuario(token, u.id, { ativo: true });
      }
      await carregar();
    } catch (e) {
      setErroLista(tratarErroAuth(e));
    } finally {
      setAlterandoId(null);
    }
  }

  const nomeEmpresa = (u: UsuarioGestao) => u.empresa?.fantasia ?? "—";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        titulo="Usuários"
        subtitulo={
          ehAdmin
            ? "Gestão de usuários de todas as empresas."
            : "Gestão de usuários da sua empresa."
        }
        acao={
          <BotaoPrimario onClick={abrirCriacao}>
            <Plus size={16} /> Novo usuário
          </BotaoPrimario>
        }
      />

      {carregando ? (
        <EstadoCarregando />
      ) : erroLista ? (
        <div className="space-y-3">
          <MensagemErro mensagem={erroLista} />
          <BotaoSecundario onClick={carregar}>Tentar novamente</BotaoSecundario>
        </div>
      ) : usuarios.length === 0 ? (
        <EstadoVazio mensagem="Nenhum usuário cadastrado ainda." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Usuário</th>
                <th className="px-4 py-3 font-semibold">Empresa</th>
                <th className="px-4 py-3 font-semibold">Perfil</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Criado em</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-slate-100 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                        <UserRound size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {u.nome}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{nomeEmpresa(u)}</td>
                  <td className="px-4 py-3">
                    <Badge cor={u.role === "USUARIO" ? "slate" : "sky"}>
                      {ROTULO_ROLE[u.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {u.ativo ? (
                        <Badge cor="green">Ativo</Badge>
                      ) : (
                        <Badge cor="slate">Inativo</Badge>
                      )}
                      {u.primeiroAcesso && (
                        <Badge cor="amber">1º acesso</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {formatarData(u.criadoEm)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEdicao(u)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        onClick={() => alternarAtivo(u)}
                        disabled={alterandoId === u.id || u.id === logado?.id}
                        className={
                          u.ativo
                            ? "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            : "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        }
                        title={
                          u.id === logado?.id
                            ? "Você não pode desativar a si mesmo"
                            : u.ativo
                              ? "Desativar"
                              : "Reativar"
                        }
                      >
                        {u.ativo ? (
                          <>
                            <Ban size={14} /> Desativar
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} /> Reativar
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rascunho && (
        <Modal
          aberto={modalAberto}
          titulo={editando ? "Editar usuário" : "Novo usuário"}
          onFechar={() => setModalAberto(false)}
          rodape={
            <>
              <BotaoSecundario onClick={() => setModalAberto(false)}>
                Cancelar
              </BotaoSecundario>
              <BotaoPrimario
                type="submit"
                form="form-usuario"
                carregando={salvando}
              >
                {editando ? "Salvar alterações" : "Cadastrar"}
              </BotaoPrimario>
            </>
          }
        >
          <form
            id="form-usuario"
            onSubmit={salvar}
            className="flex flex-col gap-4"
          >
            <Campo
              label="Nome"
              id="nome"
              value={rascunho.nome}
              onChange={(e) =>
                setRascunho((r) => r && { ...r, nome: e.target.value })
              }
              placeholder="Nome completo"
              required
              maxLength={255}
            />
            <Campo
              label="E-mail"
              id="email"
              type="email"
              value={rascunho.email}
              onChange={(e) =>
                setRascunho((r) => r && { ...r, email: e.target.value })
              }
              placeholder="usuario@empresa.com.br"
              required
            />
            {!editando && (
              <Campo
                label="Senha temporária"
                id="senha"
                type="text"
                value={rascunho.senha}
                onChange={(e) =>
                  setRascunho((r) => r && { ...r, senha: e.target.value })
                }
                placeholder="Mínimo 8 caracteres"
                dica="O usuário será obrigado a trocá-la no primeiro acesso."
                required
              />
            )}
            <CampoSelect
              label="Perfil de acesso"
              id="role"
              value={rascunho.role}
              onChange={(e) =>
                setRascunho((r) => r && { ...r, role: e.target.value as Role })
              }
            >
              {rolesDisponiveis.map((r) => (
                <option key={r} value={r}>
                  {ROTULO_ROLE[r]}
                </option>
              ))}
            </CampoSelect>
            {ehAdmin ? (
              <CampoSelect
                label="Empresa"
                id="empresaId"
                value={rascunho.empresaId}
                onChange={(e) =>
                  setRascunho(
                    (r) => r && { ...r, empresaId: Number(e.target.value) },
                  )
                }
                required
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id} disabled={!emp.ativo}>
                    {emp.fantasia}
                    {emp.ativo ? "" : " (inativa)"}
                  </option>
                ))}
              </CampoSelect>
            ) : (
              <Campo
                label="Empresa"
                id="empresaFixa"
                value={logado?.empresa?.fantasia ?? ""}
                disabled
                dica="Usuários são vinculados à sua empresa."
              />
            )}
            <MensagemErro mensagem={erroForm} />
          </form>
        </Modal>
      )}
    </div>
  );
}
