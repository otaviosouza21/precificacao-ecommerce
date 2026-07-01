"use server";

import { GET_PEDIDO_BY_ID, GET_PEDIDOS_PESQUISA } from "@/api/api";
import { PedidoCompletoApi, PedidosListApi } from "@/api/types/api-types";

// Resolve, para cada pedido de e-commerce (numero_ecommerce = id_ecommerce da
// planilha Shopee), os itens (SKU do Tiny + quantidade). É a ponte que liga a
// linha da planilha (que só tem ID de anúncio Shopee) ao produto do Tiny.

const LIMITE_PAGINAS = 200;
const DELAY_ENTRE_REQS_MS = 1100; // ~55 req/min p/ ficar dentro do plano de 60/min
const MAX_RETRIES = 4;
const ESPERA_RATE_LIMIT_MS = 60_000;

export type ItemPedidoEcommerce = { codigo: string; quantidade: number };

export type PedidosEcommerceResultado =
  | {
      ok: true;
      // id_ecommerce -> itens do pedido (codigo = SKU Tiny, ex.: "KT.0003")
      porPedido: Record<string, ItemPedidoEcommerce[]>;
      naoEncontrados: string[];
      cacheado: boolean;
    }
  | { ok: false; erro: string; rateLimited?: boolean };

// Cache server-side por período. Key = "YYYY-MM-DD|YYYY-MM-DD".
type CacheEntry = {
  porPedido: Record<string, ItemPedidoEcommerce[]>;
  geradoEm: number;
};
const cachePeriodo = new Map<string, CacheEntry>();

function isoParaBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ehErroLimite(msg: string | undefined): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("limite") ||
    m.includes("excedido") ||
    m.includes("minuto") ||
    m.includes("rate")
  );
}

async function fetchTinyJson<T>(url: string): Promise<T> {
  let tentativa = 0;
  let ultimoErro: unknown = null;

  while (tentativa <= MAX_RETRIES) {
    try {
      const response = await fetch(url, { method: "GET", cache: "no-store" });

      if (!response.ok) {
        if (response.status === 429) {
          await delay(ESPERA_RATE_LIMIT_MS);
          tentativa++;
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as T & {
        retorno?: {
          status?: string;
          codigo_erro?: string;
          erros?: { erro: string }[];
        };
      };

      const codigoErro = data?.retorno?.codigo_erro;
      const status = data?.retorno?.status;
      const mensagensErro =
        data?.retorno?.erros?.map((e) => e.erro).join("; ") || "";

      const limiteAtingido =
        codigoErro === "6" ||
        codigoErro === "20" ||
        ehErroLimite(mensagensErro);

      if (limiteAtingido) {
        const espera =
          tentativa === 0
            ? ESPERA_RATE_LIMIT_MS
            : ESPERA_RATE_LIMIT_MS * Math.pow(2, tentativa - 1);
        await delay(espera);
        tentativa++;
        ultimoErro = new Error("Limite de requisições da API Tiny atingido");
        continue;
      }

      if (status && status !== "OK") {
        const msg = mensagensErro || `Tiny retornou status ${status}`;
        throw new Error(msg);
      }

      return data as T;
    } catch (err) {
      ultimoErro = err;
      if (tentativa >= MAX_RETRIES) break;
      await delay(1000 * Math.pow(2, tentativa));
      tentativa++;
    }
  }

  throw ultimoErro instanceof Error
    ? ultimoErro
    : new Error("Falha ao consultar API Tiny");
}

export async function getPedidosEcommerceTiny(input: {
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  ids: string[]; // id_ecommerce (numero_ecommerce) a resolver
  forcar?: boolean;
}): Promise<PedidosEcommerceResultado> {
  try {
    const dataInicial = isoParaBR(input.dataInicio);
    const dataFinal = isoParaBR(input.dataFim);
    if (!dataInicial || !dataFinal) {
      return { ok: false, erro: "Período inválido" };
    }

    const idsAlvo = new Set(input.ids.map((id) => id.trim()).filter(Boolean));
    if (idsAlvo.size === 0) {
      return { ok: true, porPedido: {}, naoEncontrados: [], cacheado: false };
    }

    const chaveCache = `${input.dataInicio}|${input.dataFim}`;
    if (!input.forcar) {
      const cached = cachePeriodo.get(chaveCache);
      if (cached) {
        const porPedido: Record<string, ItemPedidoEcommerce[]> = {};
        for (const id of idsAlvo) {
          if (cached.porPedido[id]) porPedido[id] = cached.porPedido[id];
        }
        const naoEncontrados = [...idsAlvo].filter((id) => !porPedido[id]);
        return { ok: true, porPedido, naoEncontrados, cacheado: true };
      }
    }

    // 1) Lista os pedidos do período e mapeia numero_ecommerce -> id do pedido.
    const idPedidoPorEcommerce = new Map<string, string>();
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const { url } = GET_PEDIDOS_PESQUISA({ dataInicial, dataFinal, pagina });
      const data = await fetchTinyJson<PedidosListApi>(url);
      const pedidos = data.retorno.pedidos || [];

      if (pedidos.length === 0 && pagina === 1) break;

      for (const p of pedidos) {
        const numEcom = p?.pedido?.numero_ecommerce?.trim();
        const id = p?.pedido?.id;
        if (numEcom && id && idsAlvo.has(numEcom)) {
          if (!idPedidoPorEcommerce.has(numEcom)) {
            idPedidoPorEcommerce.set(numEcom, id);
          }
        }
      }

      if (pagina === 1) {
        totalPaginas = Number(data.retorno.numero_paginas || 1);
      }
      pagina++;

      if (pagina > LIMITE_PAGINAS) break;
      // Para se já achou todos os pedidos procurados.
      if (idPedidoPorEcommerce.size >= idsAlvo.size) break;
      if (pagina <= totalPaginas) await delay(DELAY_ENTRE_REQS_MS);
    } while (pagina <= totalPaginas);

    // 2) Para cada pedido encontrado, busca os itens (codigo = SKU + quantidade).
    const porPedido: Record<string, ItemPedidoEcommerce[]> = {};
    const entradas = [...idPedidoPorEcommerce.entries()];

    for (let i = 0; i < entradas.length; i++) {
      const [numEcom, idPedido] = entradas[i];
      const { url } = GET_PEDIDO_BY_ID(idPedido);
      const data = await fetchTinyJson<PedidoCompletoApi>(url);
      const itens = data.retorno.pedido?.itens || [];

      const lista: ItemPedidoEcommerce[] = [];
      for (const it of itens) {
        const codigo = it.item?.codigo?.trim();
        if (!codigo) continue;
        lista.push({ codigo, quantidade: Number(it.item.quantidade) || 0 });
      }
      porPedido[numEcom] = lista;

      if (i < entradas.length - 1) await delay(DELAY_ENTRE_REQS_MS);
    }

    cachePeriodo.set(chaveCache, { porPedido, geradoEm: Date.now() });

    const naoEncontrados = [...idsAlvo].filter((id) => !porPedido[id]);
    return { ok: true, porPedido, naoEncontrados, cacheado: false };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Erro ao consultar API Tiny";
    const rateLimited = msg.toLowerCase().includes("limite");
    return { ok: false, erro: msg, rateLimited };
  }
}
