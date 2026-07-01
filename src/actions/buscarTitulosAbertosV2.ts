"use server";

import { GET_ALL_TITULOS_RECEBER } from "@/api/api";
import {
  TitulosAReceberListApi,
  TitulosReceberApiTiny,
} from "@/api/types/api-types";

// Versão robusta do carregamento de títulos em aberto, específica da v2.
// Diferenças em relação a buscaTitulosTiny (mantida intacta para a v1):
//  - cache: "no-store" (sempre dados frescos; evita snapshot velho do Next);
//  - itera por número de página (não interrompe no primeiro contas vazio, que
//    descartava silenciosamente as páginas seguintes — onde estão os títulos
//    mais recentes);
//  - devolve o que coletou + um aviso quando alguma página falha, em vez de
//    zerar tudo.

const LIMITE_PAGINAS = 1000;
const DELAY_ENTRE_PAGINAS_MS = 250;
const MAX_TENTATIVAS_PAGINA = 3;
const ESPERA_RATE_LIMIT_MS = 20_000;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RetornoTiny = {
  status?: string;
  codigo_erro?: string;
  numero_paginas?: number;
  erros?: { erro: string }[];
  contas?: TitulosReceberApiTiny[];
};

function ehRateLimit(ret: RetornoTiny | undefined): boolean {
  if (!ret) return false;
  if (ret.codigo_erro === "6" || ret.codigo_erro === "20") return true;
  const msg = (ret.erros?.map((e) => e.erro).join(" ") || "").toLowerCase();
  return /limite|excedid|minuto|rate/.test(msg);
}

async function buscaPagina(
  pagina: number,
): Promise<{ contas: TitulosReceberApiTiny[]; numeroPaginas: number }> {
  let tentativa = 0;
  while (true) {
    const { url } = GET_ALL_TITULOS_RECEBER(pagina);
    const resp = await fetch(url, { method: "GET", cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} na página ${pagina}`);

    const data = (await resp.json()) as TitulosAReceberListApi & {
      retorno?: RetornoTiny;
    };
    const ret = data?.retorno;
    if (!ret) throw new Error(`Resposta inválida na página ${pagina}`);

    if (ehRateLimit(ret)) {
      if (tentativa >= MAX_TENTATIVAS_PAGINA) {
        throw new Error(`Limite da API Tiny atingido na página ${pagina}`);
      }
      await delay(ESPERA_RATE_LIMIT_MS * (tentativa + 1));
      tentativa++;
      continue;
    }

    return {
      contas: ret.contas || [],
      numeroPaginas: Number(ret.numero_paginas || 1),
    };
  }
}

export async function buscarTitulosAbertosV2(): Promise<{
  data: TitulosReceberApiTiny[];
  ok: boolean;
  error: string | null;
  totalColetado: number;
  totalPaginas: number;
}> {
  const contas: TitulosReceberApiTiny[] = [];
  let totalPaginas = 1;

  try {
    for (
      let pagina = 1;
      pagina <= totalPaginas && pagina <= LIMITE_PAGINAS;
      pagina++
    ) {
      const { contas: doPagina, numeroPaginas } = await buscaPagina(pagina);
      if (pagina === 1) totalPaginas = numeroPaginas;
      contas.push(...doPagina);
      if (pagina < totalPaginas) await delay(DELAY_ENTRE_PAGINAS_MS);
    }

    return {
      data: contas,
      ok: true,
      error: null,
      totalColetado: contas.length,
      totalPaginas,
    };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Erro ao buscar títulos do Tiny";
    // Devolve o parcial coletado + erro (visível), sem zerar tudo.
    return {
      data: contas,
      ok: false,
      error: msg,
      totalColetado: contas.length,
      totalPaginas,
    };
  }
}
