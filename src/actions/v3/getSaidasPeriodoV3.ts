"use server";

import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import {
  V3PedidoCompleto,
  V3PedidosListResponse,
} from "@/lib/tiny/types";
import { setProgresso } from "./progressoStore";

const LIMIT = 100;
const POOL = 3;
const SITUACAO_ENTREGUE = 4;

export type ResultadoSaidas = {
  porSku: Map<string, { total: number; numPedidos: number }>;
  totalPedidos: number;
  errosParciais: string[];
};

function normalizaSku(sku: string | undefined | null): string {
  return (sku || "").trim().toLowerCase();
}

async function processaLote<T>(
  itens: T[],
  pool: number,
  fn: (item: T) => Promise<void>
) {
  let cursor = 0;
  const workers = Array.from({ length: pool }).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= itens.length) return;
      await fn(itens[i]);
    }
  });
  await Promise.all(workers);
}

export async function getSaidasPeriodoV3(input: {
  dataInicio: string;
  dataFim: string;
  sessionKey?: string;
}): Promise<ResultadoSaidas> {
  const errosParciais: string[] = [];
  const ids: string[] = [];

  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const resp = await fetchTinyV3<V3PedidosListResponse>(ENDPOINTS.PEDIDOS, {
      query: {
        dataInicial: input.dataInicio,
        dataFinal: input.dataFim,
        situacao: SITUACAO_ENTREGUE,
        limit: LIMIT,
        offset,
      },
    });
    const itens = resp.itens ?? [];
    for (const p of itens) {
      if (p?.id != null) ids.push(String(p.id));
    }
    total = resp.paginacao?.total ?? ids.length;
    if (input.sessionKey) {
      await setProgresso(input.sessionKey, {
        etapa: "Listando pedidos entregues",
        atual: ids.length,
        total,
      });
    }
    if (itens.length < LIMIT) break;
    offset += LIMIT;
  }

  const porSku = new Map<string, { total: number; numPedidos: number }>();
  let processados = 0;

  await processaLote(ids, POOL, async (id) => {
    try {
      const detalhe = await fetchTinyV3<V3PedidoCompleto>(ENDPOINTS.PEDIDO(id));
      const itens = detalhe.itens ?? [];
      const skusNoPedido = new Set<string>();
      for (const it of itens) {
        const sku =
          it.produto?.sku ||
          it.produto?.codigo ||
          it.sku ||
          it.codigo ||
          "";
        const skuNorm = normalizaSku(sku);
        if (!skuNorm) continue;
        const qtd = Number(it.quantidade) || 0;
        let bucket = porSku.get(skuNorm);
        if (!bucket) {
          bucket = { total: 0, numPedidos: 0 };
          porSku.set(skuNorm, bucket);
        }
        bucket.total += qtd;
        skusNoPedido.add(skuNorm);
      }
      for (const sku of skusNoPedido) {
        const b = porSku.get(sku);
        if (b) b.numPedidos += 1;
      }
    } catch (err) {
      errosParciais.push(`pedido ${id}: ${err instanceof Error ? err.message : err}`);
    } finally {
      processados++;
      if (input.sessionKey) {
        await setProgresso(input.sessionKey, {
          etapa: "Lendo itens dos pedidos",
          atual: processados,
          total: ids.length,
        });
      }
    }
  });

  return {
    porSku,
    totalPedidos: ids.length,
    errosParciais,
  };
}
