"use server";

import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import { V3CustosResponse } from "@/lib/tiny/types";

export type UltimoCustoHistorico = {
  custo: number;
  data: string;
} | null;

const LIMIT = 100;

export async function getUltimoCustoHistoricoV3(
  idProduto: string
): Promise<UltimoCustoHistorico> {
  const primeira = await fetchTinyV3<V3CustosResponse>(
    ENDPOINTS.PRODUTO_CUSTOS(idProduto),
    { query: { limit: LIMIT, offset: 0 } }
  );

  const total = primeira.paginacao?.total ?? primeira.itens?.length ?? 0;
  if (total === 0) return null;

  let itens = primeira.itens ?? [];

  if (total > LIMIT) {
    const ultimaPagina = Math.floor((total - 1) / LIMIT);
    const offset = ultimaPagina * LIMIT;
    if (offset > 0) {
      const ultima = await fetchTinyV3<V3CustosResponse>(
        ENDPOINTS.PRODUTO_CUSTOS(idProduto),
        { query: { limit: LIMIT, offset } }
      );
      itens = ultima.itens ?? [];
    }
  }

  if (itens.length === 0) return null;

  let melhorData = "";
  let custoEscolhido = 0;
  for (const it of itens) {
    const data = (it.data || "").slice(0, 10);
    const preco = Number(it.precoCusto ?? 0);
    const custoMedio = Number(it.custoMedio ?? 0);
    const valor = preco || custoMedio;
    if (!data || valor <= 0) continue;
    if (data >= melhorData) {
      melhorData = data;
      custoEscolhido = valor;
    }
  }

  if (custoEscolhido <= 0) return null;
  return { custo: custoEscolhido, data: melhorData };
}
