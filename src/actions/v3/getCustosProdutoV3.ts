"use server";

import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import { V3CustosResponse } from "@/lib/tiny/types";

export type CustoResumo = {
  custoMedio: number;
  ultimoCusto: number;
  ultimaDataISO: string;
};

const LIMIT = 100;

export async function getCustosProdutoV3(input: {
  idProduto: string;
  dataInicio: string;
  dataFim: string;
}): Promise<CustoResumo | null> {
  let offset = 0;
  let total = Infinity;
  let pesoTotalQtd = 0;
  let somaPonderada = 0;
  let ultimoCusto = 0;
  let ultimoCustoMedioApi = 0;
  let ultimaDataISO = "";

  while (offset < total) {
    const resp = await fetchTinyV3<V3CustosResponse>(
      ENDPOINTS.PRODUTO_CUSTOS(input.idProduto),
      {
        query: {
          dataInicial: input.dataInicio,
          dataFinal: input.dataFim,
          limit: LIMIT,
          offset,
        },
      }
    );
    const itens = resp.itens ?? [];
    for (const it of itens) {
      const data = (it.data || "").slice(0, 10);
      const saldoAtual = Number(it.saldoAtual ?? 0);
      const saldoAnt = Number(it.saldoAnterior ?? 0);
      const delta = saldoAtual - saldoAnt;
      const preco = Number(it.precoCusto ?? 0);
      if (delta > 0 && preco > 0) {
        somaPonderada += preco * delta;
        pesoTotalQtd += delta;
      }
      if (data && data >= ultimaDataISO) {
        ultimaDataISO = data;
        if (preco) ultimoCusto = preco;
        if (it.custoMedio != null) ultimoCustoMedioApi = Number(it.custoMedio);
      }
    }
    total = resp.paginacao?.total ?? itens.length;
    if (itens.length < LIMIT) break;
    offset += LIMIT;
  }

  if (!ultimaDataISO && pesoTotalQtd === 0) return null;

  const custoMedio =
    pesoTotalQtd > 0
      ? somaPonderada / pesoTotalQtd
      : ultimoCustoMedioApi || ultimoCusto;

  return {
    custoMedio,
    ultimoCusto: ultimoCusto || custoMedio,
    ultimaDataISO,
  };
}
