"use server";

import { GET_PEDIDO_BY_ID, GET_PEDIDOS_PESQUISA } from "@/api/api";
import {
  PedidoCompletoApi,
  PedidosListApi,
} from "@/api/types/api-types";

const SITUACAO_ATENDIDO = "entregue";
const LIMITE_PAGINAS = 200;
const DELAY_ENTRE_REQS_MS = 1100; // ~55 req/min para ficar dentro do plano de 60/min
const MAX_RETRIES = 4;
const ESPERA_RATE_LIMIT_MS = 60_000;

// Cache server-side por período. Key = "YYYY-MM-DD|YYYY-MM-DD".
type CacheEntry = {
  porSku: Record<string, { total: number; numPedidos: number }>;
  totalPedidos: number;
  geradoEm: number;
};
const cachePeriodo = new Map<string, CacheEntry>();

export type SaidasPeriodoOk = {
  ok: true;
  porSku: Record<string, { total: number; numPedidos: number }>;
  totalPedidos: number;
  cacheado: boolean;
};
export type SaidasPeriodoErro = {
  ok: false;
  erro: string;
  rateLimited?: boolean;
};
export type SaidasPeriodoResultado = SaidasPeriodoOk | SaidasPeriodoErro;

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

export async function getSaidasPeriodoTiny(input: {
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  forcar?: boolean; // ignora cache
}): Promise<SaidasPeriodoResultado> {
  try {
    const dataInicial = isoParaBR(input.dataInicio);
    const dataFinal = isoParaBR(input.dataFim);

    if (!dataInicial || !dataFinal) {
      return { ok: false, erro: "Período inválido" };
    }

    const chaveCache = `${input.dataInicio}|${input.dataFim}`;
    if (!input.forcar) {
      const cached = cachePeriodo.get(chaveCache);
      if (cached) {
        console.log(
          `[saidas] cache hit ${chaveCache}: ${cached.totalPedidos} pedidos, ${
            Object.keys(cached.porSku).length
          } SKUs`
        );
        return {
          ok: true,
          porSku: cached.porSku,
          totalPedidos: cached.totalPedidos,
          cacheado: true,
        };
      }
    }

    console.log(
      `[saidas] iniciando busca ${chaveCache} (situacao=${SITUACAO_ATENDIDO})`
    );

    // 1) Lista todos os pedidos atendidos do período (sem filtro de produto)
    const idsPedidos: string[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const { url } = GET_PEDIDOS_PESQUISA({
        dataInicial,
        dataFinal,
        situacao: SITUACAO_ATENDIDO,
        pagina,
      });
      const data = await fetchTinyJson<PedidosListApi>(url);
      const pedidos = data.retorno.pedidos || [];

      if (pedidos.length === 0 && pagina === 1) break;

      for (const p of pedidos) {
        if (p?.pedido?.id) idsPedidos.push(p.pedido.id);
      }

      if (pagina === 1) {
        totalPaginas = Number(data.retorno.numero_paginas || 1);
        console.log(
          `[saidas] página 1: ${pedidos.length} pedidos, total ${totalPaginas} páginas`
        );
      }
      pagina++;

      if (pagina > LIMITE_PAGINAS) break;
      if (pagina <= totalPaginas) await delay(DELAY_ENTRE_REQS_MS);
    } while (pagina <= totalPaginas);

    console.log(
      `[saidas] coletou ${idsPedidos.length} ids de pedidos. Buscando itens...`
    );

    if (idsPedidos.length === 0) {
      const vazio: CacheEntry = {
        porSku: {},
        totalPedidos: 0,
        geradoEm: Date.now(),
      };
      cachePeriodo.set(chaveCache, vazio);
      return { ok: true, porSku: {}, totalPedidos: 0, cacheado: false };
    }

    // 2) Para cada pedido, busca itens e indexa por SKU
    const porSku: Record<string, { total: number; numPedidos: number }> = {};

    for (let i = 0; i < idsPedidos.length; i++) {
      const id = idsPedidos[i];
      const { url } = GET_PEDIDO_BY_ID(id);
      const data = await fetchTinyJson<PedidoCompletoApi>(url);
      const itens = data.retorno.pedido?.itens || [];

      // Conta cada SKU uma vez por pedido (evita inflar numPedidos se o mesmo
      // produto aparece em múltiplas linhas do pedido)
      const skusNoPedido = new Set<string>();

      for (const it of itens) {
        const codigoBruto = it.item?.codigo?.trim();
        if (!codigoBruto) continue;
        const codigo = codigoBruto.toLowerCase();
        const qtd = Number(it.item.quantidade) || 0;
        if (!porSku[codigo]) porSku[codigo] = { total: 0, numPedidos: 0 };
        porSku[codigo].total += qtd;
        skusNoPedido.add(codigo);
      }

      for (const sku of skusNoPedido) {
        porSku[sku].numPedidos += 1;
      }

      if (i < idsPedidos.length - 1) await delay(DELAY_ENTRE_REQS_MS);

      if ((i + 1) % 25 === 0) {
        console.log(
          `[saidas] processados ${i + 1}/${idsPedidos.length} pedidos. SKUs únicos: ${
            Object.keys(porSku).length
          }`
        );
      }
    }

    const amostra = Object.entries(porSku)
      .slice(0, 10)
      .map(([sku, v]) => `${sku}=${v.total}`)
      .join(", ");
    console.log(
      `[saidas] FINALIZADO: ${idsPedidos.length} pedidos, ${
        Object.keys(porSku).length
      } SKUs distintos. Amostra: ${amostra}`
    );

    cachePeriodo.set(chaveCache, {
      porSku,
      totalPedidos: idsPedidos.length,
      geradoEm: Date.now(),
    });

    return {
      ok: true,
      porSku,
      totalPedidos: idsPedidos.length,
      cacheado: false,
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Erro ao consultar API Tiny";
    const rateLimited = msg.toLowerCase().includes("limite");
    return { ok: false, erro: msg, rateLimited };
  }
}
