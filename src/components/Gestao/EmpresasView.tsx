"use client";

import { Ban, Building2, CheckCircle2, Pencil, Plus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthApiError } from "@/lib/auth/api";
import {
  atualizarEmpresa,
  criarEmpresa,
  desativarEmpresa,
  listarEmpresas,
} from "@/lib/gestao/api";
import { apenasDigitos, formatarCnpj, formatarData } from "@/lib/gestao/format";
import type { Empresa } from "@/lib/gestao/types";
import {
  Badge,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  EstadoCarregando,
  EstadoVazio,
  MensagemErro,
  Modal,
  PageHeader,
} from "./ui";

type Rascunho = { razaoSocial: string; fantasia: string; cnpj: string };

const RASCUNHO_VAZIO: Rascunho = { razaoSocial: "", fantasia: "", cnpj: "" };

export default function EmpresasView() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [rascunho, setRascunho] = useState<Rascunho>(RASCUNHO_VAZIO);
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
      setEmpresas(await listarEmpresas(token));
    } catch (e) {
      setErroLista(tratarErroAuth(e));
    } finally {
      setCarregando(false);
    }
  }, [token, tratarErroAuth]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirCriacao() {
    setEditando(null);
    setRascunho(RASCUNHO_VAZIO);
    setErroForm(null);
    setModalAberto(true);
  }

  function abrirEdicao(empresa: Empresa) {
    setEditando(empresa);
    setRascunho({
      razaoSocial: empresa.razaoSocial,
      fantasia: empresa.fantasia,
      cnpj: formatarCnpj(empresa.cnpj),
    });
    setErroForm(null);
    setModalAberto(true);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setErroForm(null);

    if (apenasDigitos(rascunho.cnpj).length !== 14) {
      setErroForm("CNPJ deve ter 14 dígitos.");
      return;
    }

    setSalvando(true);
    try {
      if (editando) {
        await atualizarEmpresa(token, editando.id, {
          razaoSocial: rascunho.razaoSocial,
          fantasia: rascunho.fantasia,
          cnpj: apenasDigitos(rascunho.cnpj),
        });
      } else {
        await criarEmpresa(token, {
          razaoSocial: rascunho.razaoSocial,
          fantasia: rascunho.fantasia,
          cnpj: apenasDigitos(rascunho.cnpj),
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

  async function alternarAtivo(empresa: Empresa) {
    if (!token) return;
    const acao = empresa.ativo ? "desativar" : "reativar";
    if (!window.confirm(`Deseja ${acao} a empresa "${empresa.fantasia}"?`))
      return;

    setAlterandoId(empresa.id);
    try {
      if (empresa.ativo) {
        await desativarEmpresa(token, empresa.id);
      } else {
        await atualizarEmpresa(token, empresa.id, { ativo: true });
      }
      await carregar();
    } catch (e) {
      setErroLista(tratarErroAuth(e));
    } finally {
      setAlterandoId(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        titulo="Empresas"
        subtitulo="Cadastro e gestão das empresas do sistema."
        acao={
          <BotaoPrimario onClick={abrirCriacao}>
            <Plus size={16} /> Nova empresa
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
      ) : empresas.length === 0 ? (
        <EstadoVazio mensagem="Nenhuma empresa cadastrada ainda." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Empresa</th>
                <th className="px-4 py-3 font-semibold">CNPJ</th>
                <th className="px-4 py-3 font-semibold">Usuários</th>
                <th className="px-4 py-3 font-semibold">Criada em</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr
                  key={empresa.id}
                  className="border-t border-slate-100 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                        <Building2 size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {empresa.fantasia}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {empresa.razaoSocial}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {formatarCnpj(empresa.cnpj)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {empresa._count?.usuarios ?? 0}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {formatarData(empresa.criadoEm)}
                  </td>
                  <td className="px-4 py-3">
                    {empresa.ativo ? (
                      <Badge cor="green">Ativa</Badge>
                    ) : (
                      <Badge cor="slate">Inativa</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirEdicao(empresa)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        onClick={() => alternarAtivo(empresa)}
                        disabled={alterandoId === empresa.id}
                        className={
                          empresa.ativo
                            ? "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                            : "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
                        }
                        title={empresa.ativo ? "Desativar" : "Reativar"}
                      >
                        {empresa.ativo ? (
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

      <Modal
        aberto={modalAberto}
        titulo={editando ? "Editar empresa" : "Nova empresa"}
        onFechar={() => setModalAberto(false)}
        rodape={
          <>
            <BotaoSecundario onClick={() => setModalAberto(false)}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario
              type="submit"
              form="form-empresa"
              carregando={salvando}
            >
              {editando ? "Salvar alterações" : "Cadastrar"}
            </BotaoPrimario>
          </>
        }
      >
        <form
          id="form-empresa"
          onSubmit={salvar}
          className="flex flex-col gap-4"
        >
          <Campo
            label="Nome fantasia"
            id="fantasia"
            value={rascunho.fantasia}
            onChange={(e) =>
              setRascunho((r) => ({ ...r, fantasia: e.target.value }))
            }
            placeholder="Ex.: Bikeline"
            required
            maxLength={255}
          />
          <Campo
            label="Razão social"
            id="razaoSocial"
            value={rascunho.razaoSocial}
            onChange={(e) =>
              setRascunho((r) => ({ ...r, razaoSocial: e.target.value }))
            }
            placeholder="Ex.: Bikeline LTDA"
            required
            maxLength={255}
          />
          <Campo
            label="CNPJ"
            id="cnpj"
            value={rascunho.cnpj}
            onChange={(e) =>
              setRascunho((r) => ({ ...r, cnpj: formatarCnpj(e.target.value) }))
            }
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            required
          />
          <MensagemErro mensagem={erroForm} />
        </form>
      </Modal>
    </div>
  );
}
