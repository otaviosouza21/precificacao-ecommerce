"use server";

import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import {
  TinyAuthError,
  V3PedidoCompleto,
  V3PedidosListResponse,
} from "@/lib/tiny/types";
import { setProgresso, limparProgresso } from "./progressoStore";
import { ItemVendaSku } from "@/components/RelatorioCustos/tipos";
import { isoParaBR, normalizaSku, processaLote } from "./_helpers";

const LIMIT = 100;
const POOL = 3;
const SITUACAO_ENTREGUE = 4;

export type SaidaSkuDetalhada = {
  sku: string;
  nome: string;
  total: number;
  receita: number;
  numPedidos: number;
  idProdutoCandidato?: string;
  itens: ItemVendaSku[];
};

export type SaidasProdutosOk = {
  ok: true;
  porSku: Record<string, SaidaSkuDetalhada>;
  totalPedidos: number;
  errosParciais: string[];
};
export type SaidasProdutosErro = {
  ok: false;
  motivo: "auth" | "rate" | "outro";
  mensagem: string;
  precisaRelogar?: boolean;
};

function dataISOdoPedido(p: V3PedidoCompleto): string {
  const v = p.dataCriacao || p.dataPrevista || "";
  return typeof v === "string" ? v.slice(0, 10) : "";
}

export async function getSaidasProdutosV3(input: {
  skus: string[];
  ids: string[];
  dataInicio: string;
  dataFim: string;
  sessionKey: string;
}): Promise<SaidasProdutosOk | SaidasProdutosErro> {
  const filtroAtivo = input.skus.length > 0 || input.ids.length > 0;
  const skusAlvo = new Set(input.skus.map(normalizaSku));
  const idsAlvo = new Set(input.ids);
  const errosParciais: string[] = [];

  try {
    const ids: string[] = [];
    let offset = 0;
    let total = Infinity;
    await setProgresso(input.sessionKey, {
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
      await setProgresso(input.sessionKey, {
        etapa: "Listando pedidos entregues",
        atual: ids.length,
        total,
      });
      if (itens.length < LIMIT) break;
      offset += LIMIT;
    }

    const porSku: Record<string, SaidaSkuDetalhada> = {};
    let proc = 0;
    await setProgresso(input.sessionKey, {
      etapa: "Lendo itens dos pedidos",
      atual: 0,
      total: ids.length,
    });

    await processaLote(ids, POOL, async (id) => {
      try {
        const detalhe = await fetchTinyV3<V3PedidoCompleto>(
          ENDPOINTS.PEDIDO(id)
        );
        const itens = detalhe.itens ?? [];
        const dataISO = dataISOdoPedido(detalhe);
        const numero = String(detalhe.numero ?? id);
        const skusNoPedido = new Set<string>();

        for (const it of itens) {
          const idProd =
            it.produto?.id != null ? String(it.produto.id) : "";
          const sku =
            it.produto?.sku ||
            it.produto?.codigo ||
            it.sku ||
            it.codigo ||
            "";
          const skuNorm = normalizaSku(sku);
          if (!skuNorm) continue;

          if (filtroAtivo) {
            const match =
              (idProd && idsAlvo.has(idProd)) || skusAlvo.has(skuNorm);
            if (!match) continue;
          }

          const qtd = Number(it.quantidade) || 0;
          const valorUnit = Number(it.valorUnitario) || 0;
          const valorTotal = qtd * valorUnit;
          const nome =
            it.produto?.nome ||
            it.produto?.descricao ||
            it.descricao ||
            skuNorm;

          let bucket = porSku[skuNorm];
          if (!bucket) {
            bucket = {
              sku: skuNorm,
              nome,
              total: 0,
              receita: 0,
              numPedidos: 0,
              idProdutoCandidato: idProd || undefined,
              itens: [],
            };
            porSku[skuNorm] = bucket;
          } else if (!bucket.idProdutoCandidato && idProd) {
            bucket.idProdutoCandidato = idProd;
          }

          bucket.total += qtd;
          bucket.receita += valorTotal;
          bucket.itens.push({
            idPedido: id,
            numero,
            dataISO,
            data: isoParaBR(dataISO),
            quantidade: qtd,
            valorUnitario: valorUnit,
            valorTotal,
          });
          skusNoPedido.add(skuNorm);
        }

        for (const sku of skusNoPedido) {
          const b = porSku[sku];
          if (b) b.numPedidos += 1;
        }
      } catch (err) {
        errosParciais.push(
          `pedido ${id}: ${err instanceof Error ? err.message : err}`
        );
      } finally {
        proc++;
        await setProgresso(input.sessionKey, {
          etapa: "Lendo itens dos pedidos",
          atual: proc,
          total: ids.length,
        });
      }
    });

    return { ok: true, porSku, totalPedidos: ids.length, errosParciais };
  } catch (err) {
    await limparProgresso(input.sessionKey);
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
      motivo:
        msg.includes("429") || msg.toLowerCase().includes("limite")
          ? "rate"
          : "outro",
      mensagem: msg,
    };
  }
}
