"use server";

import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import {
  V3NotaCompleta,
  V3NotasListResponse,
} from "@/lib/tiny/types";
import { setProgresso } from "./progressoStore";

const LIMIT = 100;
const POOL = 3;

export type EntradaPorSku = {
  sku: string;
  nome: string;
  qtdEntrada: number;
  valorEntrada: number;
  ultimaDataISO: string;
  ultimoPreco: number;
  idsProdutoCandidatos: Set<string>;
  notas: {
    idNota: string;
    numero: string;
    data: string;
    dataISO: string;
    quantidade: number;
    precoUnitario: number;
    valorTotal: number;
  }[];
};

export type ResultadoNotasEntrada = {
  porSku: Map<string, EntradaPorSku>;
  totalNotas: number;
  errosParciais: string[];
};

function normalizaSku(sku: string | undefined | null): string {
  return (sku || "").trim().toLowerCase();
}

function dataISOdaNota(n: V3NotaCompleta): string {
  const v = n.dataEmissao || n.dataInclusao || "";
  return typeof v === "string" ? v.slice(0, 10) : "";
}

async function processaLote<T>(
  itens: T[],
  pool: number,
  fn: (item: T, indice: number) => Promise<void>
) {
  let cursor = 0;
  const workers = Array.from({ length: pool }).map(async () => {
    while (true) {
      const i = cursor++;
      if (i >= itens.length) return;
      await fn(itens[i], i);
    }
  });
  await Promise.all(workers);
}

export async function getNotasEntradaV3(input: {
  dataInicio: string;
  dataFim: string;
  sessionKey?: string;
}): Promise<ResultadoNotasEntrada> {
  const errosParciais: string[] = [];
  const cabecalhos: { id: string; numero: string; dataISO: string }[] = [];

  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const resp = await fetchTinyV3<V3NotasListResponse>(ENDPOINTS.NOTAS, {
      query: {
        tipo: "E",
        dataInicial: input.dataInicio,
        dataFinal: input.dataFim,
        limit: LIMIT,
        offset,
      },
    });
    const itens = resp.itens ?? [];
    for (const n of itens) {
      const id = n.id != null ? String(n.id) : "";
      if (!id) continue;
      cabecalhos.push({
        id,
        numero: String(n.numero ?? ""),
        dataISO: dataISOdaNota(n),
      });
    }
    total = resp.paginacao?.total ?? cabecalhos.length;
    if (input.sessionKey) {
      setProgresso(input.sessionKey, {
        etapa: "Listando notas de entrada",
        atual: cabecalhos.length,
        total,
      });
    }
    if (itens.length < LIMIT) break;
    offset += LIMIT;
  }

  const porSku = new Map<string, EntradaPorSku>();
  let processadas = 0;

  await processaLote(cabecalhos, POOL, async (cab) => {
    try {
      const detalhe = await fetchTinyV3<V3NotaCompleta>(ENDPOINTS.NOTA(cab.id));
      const itens = detalhe.itens ?? [];
      for (const it of itens) {
        const sku =
          it.produto?.sku ||
          it.produto?.codigo ||
          it.sku ||
          it.codigo ||
          "";
        const skuNorm = normalizaSku(sku);
        if (!skuNorm) continue;
        const nome =
          it.produto?.nome ||
          it.produto?.descricao ||
          it.descricao ||
          skuNorm;
        const qtd = Number(it.quantidade) || 0;
        const preco =
          Number(it.valorUnitario) ||
          (Number(it.valorTotal) && qtd
            ? Number(it.valorTotal) / qtd
            : 0);
        const valorTotal =
          Number(it.valorTotal) ||
          (qtd && preco ? qtd * preco : Number(it.valor) || 0);
        const idProduto = it.produto?.id != null ? String(it.produto.id) : "";

        const dataISO = cab.dataISO || detalhe.dataEmissao || "";

        let bucket = porSku.get(skuNorm);
        if (!bucket) {
          bucket = {
            sku: skuNorm,
            nome,
            qtdEntrada: 0,
            valorEntrada: 0,
            ultimaDataISO: "",
            ultimoPreco: 0,
            idsProdutoCandidatos: new Set<string>(),
            notas: [],
          };
          porSku.set(skuNorm, bucket);
        }
        bucket.qtdEntrada += qtd;
        bucket.valorEntrada += valorTotal;
        if (idProduto) bucket.idsProdutoCandidatos.add(idProduto);
        if (dataISO && dataISO >= bucket.ultimaDataISO) {
          bucket.ultimaDataISO = dataISO;
          bucket.ultimoPreco = preco || bucket.ultimoPreco;
          bucket.nome = nome || bucket.nome;
        }
        bucket.notas.push({
          idNota: cab.id,
          numero: cab.numero,
          data: dataISO ? dataISO.split("-").reverse().join("/") : "",
          dataISO,
          quantidade: qtd,
          precoUnitario: preco,
          valorTotal,
        });
      }
    } catch (err) {
      errosParciais.push(`nota ${cab.id}: ${err instanceof Error ? err.message : err}`);
    } finally {
      processadas++;
      if (input.sessionKey) {
        setProgresso(input.sessionKey, {
          etapa: "Lendo itens das notas de entrada",
          atual: processadas,
          total: cabecalhos.length,
        });
      }
    }
  });

  return {
    porSku,
    totalNotas: cabecalhos.length,
    errosParciais,
  };
}
