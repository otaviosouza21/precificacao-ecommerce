"use server";

import { GET_PEDIDOS_PESQUISA } from "@/api/api";
import type { PedidosListApi } from "@/api/types/api-types";

/**
 * Lista os pedidos de Mercado Livre de um período, para o modo CONFERÊNCIA.
 *
 * Nos meses anteriores à ativação da integração financeira, os pedidos do ML
 * existem no Tiny mas sem conta a receber. Sem título, a contraparte do
 * recebimento passa a ser o próprio pedido — é ele que diz quanto a venda
 * valia, e é contra ele que o valor bruto do relatório é conferido.
 *
 * Barato de propósito: o resumo do pedido já vem na listagem, então é UMA
 * chamada por página (~100 pedidos). Difere de `getPedidosEcommerceTiny`, que
 * faz uma chamada extra por pedido para buscar os itens — custo que aqui não
 * se justifica.
 */

const LIMITE_PAGINAS = 400;
const DELAY_ENTRE_PAGINAS_MS = 350;
const MAX_TENTATIVAS = 4;
const ESPERA_RATE_LIMIT_MS = 30_000;

export type PedidoML = {
  /** Número do pedido no Tiny. */
  numero: string;
  valor: number;
  situacao: string;
  cliente: string;
  /** DD/MM/AAAA, como o Tiny devolve. */
  data_pedido: string;
};

export type ResultadoPedidosML = {
  /** numero_ecommerce (16 dígitos) -> resumo do pedido. */
  porPedido: Record<string, PedidoML>;
  ok: boolean;
  error: string | null;
  totalPedidos: number;
  totalPaginas: number;
  cacheado: boolean;
};

/** Cache por período na memória do servidor. Chave: "YYYY-MM-DD|YYYY-MM-DD". */
type CacheEntry = { porPedido: Record<string, PedidoML>; geradoEm: number };
const cachePeriodo = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

/** Só Mercado Livre: 16 dígitos. A Shopee usa order_sn alfanumérico. */
const ehIdML = (v: string) => /^\d{16}$/.test(v);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isoParaBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

type RetornoTiny = {
  status?: string;
  codigo_erro?: string;
  numero_paginas?: number;
  erros?: { erro: string }[];
  pedidos?: PedidosListApi["retorno"]["pedidos"];
};

function ehRateLimit(ret: RetornoTiny | undefined): boolean {
  if (!ret) return false;
  if (ret.codigo_erro === "6" || ret.codigo_erro === "20") return true;
  const msg = (ret.erros?.map((e) => e.erro).join(" ") || "").toLowerCase();
  return /limite|excedid|minuto|rate/.test(msg);
}

async function buscaPagina(
  dataInicial: string,
  dataFinal: string,
  pagina: number,
): Promise<{ pedidos: NonNullable<RetornoTiny["pedidos"]>; numeroPaginas: number }> {
  let tentativa = 0;

  while (true) {
    const { url } = GET_PEDIDOS_PESQUISA({ dataInicial, dataFinal, pagina });
    const resp = await fetch(url, { method: "GET", cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} na página ${pagina}`);

    const data = (await resp.json()) as { retorno?: RetornoTiny };
    const ret = data?.retorno;
    if (!ret) throw new Error(`Resposta inválida na página ${pagina}`);

    if (ehRateLimit(ret)) {
      if (tentativa >= MAX_TENTATIVAS) {
        throw new Error(`Limite da API Tiny atingido na página ${pagina}`);
      }
      await delay(ESPERA_RATE_LIMIT_MS * (tentativa + 1));
      tentativa++;
      continue;
    }

    return {
      pedidos: ret.pedidos || [],
      numeroPaginas: Number(ret.numero_paginas || 1),
    };
  }
}

export async function buscarPedidosML(input: {
  /** YYYY-MM-DD */
  dataInicio: string;
  /** YYYY-MM-DD */
  dataFim: string;
  forcar?: boolean;
}): Promise<ResultadoPedidosML> {
  const vazio = (error: string | null, ok = false): ResultadoPedidosML => ({
    porPedido: {},
    ok,
    error,
    totalPedidos: 0,
    totalPaginas: 0,
    cacheado: false,
  });

  const dataInicial = isoParaBR(input.dataInicio);
  const dataFinal = isoParaBR(input.dataFim);
  if (!dataInicial || !dataFinal) return vazio("Período inválido");

  const chave = `${input.dataInicio}|${input.dataFim}`;
  if (!input.forcar) {
    const cached = cachePeriodo.get(chave);
    if (cached && Date.now() - cached.geradoEm < CACHE_TTL_MS) {
      return {
        porPedido: cached.porPedido,
        ok: true,
        error: null,
        totalPedidos: Object.keys(cached.porPedido).length,
        totalPaginas: 0,
        cacheado: true,
      };
    }
  }

  const porPedido: Record<string, PedidoML> = {};
  let totalPaginas = 1;

  try {
    for (
      let pagina = 1;
      pagina <= totalPaginas && pagina <= LIMITE_PAGINAS;
      pagina++
    ) {
      const { pedidos, numeroPaginas } = await buscaPagina(
        dataInicial,
        dataFinal,
        pagina,
      );
      if (pagina === 1) totalPaginas = numeroPaginas;

      for (const p of pedidos) {
        const idEcom = String(p?.pedido?.numero_ecommerce || "").trim();
        if (!ehIdML(idEcom) || porPedido[idEcom]) continue;
        porPedido[idEcom] = {
          numero: String(p.pedido.numero || ""),
          valor: Number(p.pedido.valor) || 0,
          situacao: String(p.pedido.situacao || ""),
          cliente: String(p.pedido.nome || ""),
          data_pedido: String(p.pedido.data_pedido || ""),
        };
      }

      if (pagina < totalPaginas) await delay(DELAY_ENTRE_PAGINAS_MS);
    }

    cachePeriodo.set(chave, { porPedido, geradoEm: Date.now() });

    return {
      porPedido,
      ok: true,
      error: null,
      totalPedidos: Object.keys(porPedido).length,
      totalPaginas,
      cacheado: false,
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Erro ao buscar pedidos do Tiny";
    // Devolve o parcial coletado com o aviso, em vez de perder tudo.
    return {
      porPedido,
      ok: false,
      error: msg,
      totalPedidos: Object.keys(porPedido).length,
      totalPaginas,
      cacheado: false,
    };
  }
}
