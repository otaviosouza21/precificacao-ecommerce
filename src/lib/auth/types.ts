export type Role = "ADMINISTRADOR" | "MASTER" | "USUARIO";

export type EmpresaResumo = {
  id: number;
  fantasia: string;
  razaoSocial?: string;
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  role: Role;
  primeiroAcesso: boolean;
  empresa: EmpresaResumo | null;
};

export type LoginResponse = {
  access_token: string;
  usuario: Usuario;
};

export type EsqueciSenhaResponse = {
  mensagem: string;
  // Provisório: enquanto não há serviço de e-mail, a API retorna o token na resposta.
  resetToken?: string;
};
