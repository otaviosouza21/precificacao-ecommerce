"use server";

import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import {
  TinyAuthError,
  V3PedidoCompleto,
  V3PedidosListResponse,
} from "@/lib/tiny/types";
import { setProgresso, limparProgresso } from "./progressoStore";

const LIMIT = 100;
const POOL = 3;
const SITUACAO_ENTREGUE = 4;

export type SaidasProdutosOk = {
  ok: true;
  porSku: Record<string, { total: number; numPedidos: number }>;
  totalPedidos: number;
  errosParciais: string[];
};
export type SaidasProdutosErro = {
  ok: false;
  motivo: "auth" | "rate" | "outro";
  mensagem: string;
  precisaRelogar?: boolean;
};

function norm(s: string | undefined | null) {
  return (s || "").trim().toLowerCase();
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

export async function getSaidasProdutosV3(input: {
  skus: string[];
  ids: string[];
  dataInicio: string;
  dataFim: string;
  sessionKey: string;
}): Promise<SaidasProdutosOk | SaidasProdutosErro> {
  const skusAlvo = new Set(input.skus.map(norm));
  const idsAlvo = new Set(input.ids);
  const errosParciais: string[] = [];

  try {
    const ids: string[] = [];
    let offset = 0;
    let total = Infinity;
    setProgresso(input.sessionKey, {
      etapa: "Listando pedidos entregues",
      atual: 0,
      total: 0,
    });
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
      for (const p of itens) if (p.id != null) ids.push(String(p.id));
      total = resp.paginacao?.total ?? ids.length;
      setProgresso(input.sessionKey, {
        etapa: "Listando pedidos entregues",
        atual: ids.length,
        total,
      });
      if (itens.length < LIMIT) break;
      offset += LIMIT;
    }

    const porSku: Record<string, { total: number; numPedidos: number }> = {};
    let proc = 0;
    setProgresso(input.sessionKey, {
      etapa: "Lendo itens dos pedidos",
      atual: 0,
      total: ids.length,
    });
    await processaLote(ids, POOL, async (id) => {
      try {
        const detalhe = await fetchTinyV3<V3PedidoCompleto>(ENDPOINTS.PEDIDO(id));
        const itens = detalhe.itens ?? [];
        const skusNoPedido = new Set<string>();
        for (const it of itens) {
          const idProd = it.produto?.id != null ? String(it.produto.id) : "";
          const sku = it.produto?.sku || it.produto?.codigo || it.sku || it.codigo || "";
          const skuNorm = norm(sku);
          const match = (idProd && idsAlvo.has(idProd)) || (skuNorm && skusAlvo.has(skuNorm));
          if (!match) continue;
          const qtd = Number(it.quantidade) || 0;
          if (!porSku[skuNorm]) porSku[skuNorm] = { total: 0, numPedidos: 0 };
          porSku[skuNorm].total += qtd;
          skusNoPedido.add(skuNorm);
        }
        for (const sku of skusNoPedido) porSku[sku].numPedidos += 1;
      } catch (err) {
        errosParciais.push(`pedido ${id}: ${err instanceof Error ? err.message : err}`);
      } finally {
        proc++;
        setProgresso(input.sessionKey, {
          etapa: "Lendo itens dos pedidos",
          atual: proc,
          total: ids.length,
        });
      }
    });

    limparProgresso(input.sessionKey);
    return { ok: true, porSku, totalPedidos: ids.length, errosParciais };
  } catch (err) {
    limparProgresso(input.sessionKey);
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
