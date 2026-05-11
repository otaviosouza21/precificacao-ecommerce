"use server";

import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import {
  TinyAuthError,
  V3ProdutoCabecalho,
  V3ProdutosListResponse,
} from "@/lib/tiny/types";

export type ProdutoBusca = {
  id: string;
  sku: string;
  nome: string;
  precoCusto?: number;
  custoMedio?: number;
  situacao?: string;
};

export type ResultadoBuscarProdutos =
  | { ok: true; itens: ProdutoBusca[]; total: number }
  | {
      ok: false;
      mensagem: string;
      motivo?: "auth" | "rate" | "outro";
      precisaRelogar?: boolean;
    };

function mapItem(p: V3ProdutoCabecalho): ProdutoBusca {
  type ComPrecos = V3ProdutoCabecalho & {
    precos?: { precoCusto?: number; precoCustoMedio?: number };
  };
  const r = p as ComPrecos;
  return {
    id: String(p.id ?? ""),
    sku: String(p.sku ?? p.codigo ?? ""),
    nome: p.descricao ?? p.nome ?? "",
    precoCusto: r.precos?.precoCusto,
    custoMedio: r.precos?.precoCustoMedio,
    situacao: p.situacao,
  };
}

export async function buscarProdutosV3(input: {
  termo: string;
  limite?: number;
}): Promise<ResultadoBuscarProdutos> {
  const termo = input.termo.trim();
  if (!termo) return { ok: true, itens: [], total: 0 };
  const limit = Math.min(input.limite ?? 10, 50);

  try {
    const porNome = await fetchTinyV3<V3ProdutosListResponse>(
      ENDPOINTS.PRODUTOS,
      { query: { nome: termo, situacao: "A", limit, offset: 0 } }
    );
    let itens = (porNome.itens ?? []).map(mapItem);
    let total = porNome.paginacao?.total ?? itens.length;

    if (itens.length === 0) {
      const porCodigo = await fetchTinyV3<V3ProdutosListResponse>(
        ENDPOINTS.PRODUTOS,
        { query: { codigo: termo, situacao: "A", limit, offset: 0 } }
      );
      itens = (porCodigo.itens ?? []).map(mapItem);
      total = porCodigo.paginacao?.total ?? itens.length;
    }

    return { ok: true, itens, total };
  } catch (err) {
    if (err instanceof TinyAuthError) {
      return {
        ok: false,
        motivo: "auth",
        precisaRelogar: true,
        mensagem:
          err.motivo === "refresh_expired"
            ? "Sessão Tiny expirada — reconecte."
            : "Não conectado ao Tiny.",
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      motivo: msg.includes("429") || msg.toLowerCase().includes("limite") ? "rate" : "outro",
      mensagem: msg,
    };
  }
}
