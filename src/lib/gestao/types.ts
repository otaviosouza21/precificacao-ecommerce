import type { Role } from "@/lib/auth/types";

export type Empresa = {
  id: number;
  razaoSocial: string;
  cnpj: string;
  fantasia: string;
  ativo: boolean;
  criadoEm: string;
  _count?: { usuarios: number };
};

export type UsuarioGestao = {
  id: number;
  nome: string;
  email: string;
  role: Role;
  primeiroAcesso: boolean;
  ativo: boolean;
  criadoEm: string;
  empresaId: number;
  empresa: { id: number; fantasia: string } | null;
};

export type CriarEmpresaInput = {
  razaoSocial: string;
  cnpj: string;
  fantasia: string;
};

export type AtualizarEmpresaInput = Partial<CriarEmpresaInput> & {
  ativo?: boolean;
};

export type CriarUsuarioInput = {
  nome: string;
  email: string;
  senha: string;
  role?: Role;
  empresaId: number;
};

export type AtualizarUsuarioInput = {
  nome?: string;
  email?: string;
  role?: Role;
  empresaId?: number;
  ativo?: boolean;
};
