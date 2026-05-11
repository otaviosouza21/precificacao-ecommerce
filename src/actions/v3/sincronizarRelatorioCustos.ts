"use server";

import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import { TinyAuthError, V3ProdutosListResponse } from "@/lib/tiny/types";
import {
  NotaEntradaItem,
  ProdutoRelatorio,
} from "@/components/RelatorioCustos/tipos";
import { getCustosProdutoV3 } from "./getCustosProdutoV3";
import { getNotasEntradaV3 } from "./getNotasEntradaV3";
import { getSaidasPeriodoV3 } from "./getSaidasPeriodoV3";
import { limparProgresso, setProgresso } from "./progressoStore";

export type SyncResultadoOk = {
  ok: true;
  produtos: ProdutoRelatorio[];
  meta: {
    totalNotas: number;
    totalPedidos: number;
    geradoEm: number;
    cacheado: boolean;
    errosParciais: string[];
  };
};

export type SyncResultadoErro = {
  ok: false;
  motivo: "auth" | "rate" | "outro";
  mensagem: string;
  precisaRelogar?: boolean;
};

type CacheEntry = SyncResultadoOk;
const cachePeriodo = new Map<string, CacheEntry>();
const POOL_CUSTOS = 3;

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

async function resolverIdProdutoPorSku(sku: string): Promise<string | null> {
  try {
    const resp = await fetchTinyV3<V3ProdutosListResponse>(ENDPOINTS.PRODUTOS, {
      query: { codigo: sku, limit: 1, offset: 0 },
    });
    const item = resp.itens?.[0];
    if (item?.id != null) return String(item.id);
    return null;
  } catch {
    return null;
  }
}

export async function sincronizarRelatorioCustos(input: {
  dataInicio: string;
  dataFim: string;
  sessionKey: string;
  forcar?: boolean;
}): Promise<SyncResultadoOk | SyncResultadoErro> {
  const chaveCache = `${input.dataInicio}|${input.dataFim}`;
  if (!input.forcar) {
    const cached = cachePeriodo.get(chaveCache);
    if (cached) {
      return {
        ...cached,
        meta: { ...cached.meta, cacheado: true },
      };
    }
  }

  try {
    setProgresso(input.sessionKey, {
      etapa: "Iniciando sincronização",
      atual: 0,
      total: 0,
    });

    const [notas, saidas] = await Promise.all([
      getNotasEntradaV3({
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        sessionKey: input.sessionKey,
      }),
      getSaidasPeriodoV3({
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        sessionKey: input.sessionKey,
      }),
    ]);

    const skusComEntrada = Array.from(notas.porSku.keys());
    const errosCustos: string[] = [];
    const custosPorSku = new Map<
      string,
      { custoMedio: number; ultimoCusto: number; idProduto?: string }
    >();

    let processados = 0;
    setProgresso(input.sessionKey, {
      etapa: "Buscando custos por produto",
      atual: 0,
      total: skusComEntrada.length,
    });

    await processaLote(skusComEntrada, POOL_CUSTOS, async (sku) => {
      const entrada = notas.porSku.get(sku);
      if (!entrada) return;
      let idProduto = Array.from(entrada.idsProdutoCandidatos)[0];
      if (!idProduto) {
        const id = await resolverIdProdutoPorSku(sku);
        if (id) idProduto = id;
      }
      if (!idProduto) {
        custosPorSku.set(sku, {
          custoMedio: entrada.qtdEntrada > 0
            ? entrada.valorEntrada / entrada.qtdEntrada
            : 0,
          ultimoCusto: entrada.ultimoPreco,
        });
      } else {
        try {
          const resumo = await getCustosProdutoV3({
            idProduto,
            dataInicio: input.dataInicio,
            dataFim: input.dataFim,
          });
          if (resumo) {
            custosPorSku.set(sku, {
              custoMedio: resumo.custoMedio,
              ultimoCusto: resumo.ultimoCusto,
              idProduto,
            });
          } else {
            custosPorSku.set(sku, {
              custoMedio:
                entrada.qtdEntrada > 0
                  ? entrada.valorEntrada / entrada.qtdEntrada
                  : 0,
              ultimoCusto: entrada.ultimoPreco,
              idProduto,
            });
          }
        } catch (err) {
          errosCustos.push(`custos ${sku}: ${err instanceof Error ? err.message : err}`);
          custosPorSku.set(sku, {
            custoMedio:
              entrada.qtdEntrada > 0
                ? entrada.valorEntrada / entrada.qtdEntrada
                : 0,
            ultimoCusto: entrada.ultimoPreco,
            idProduto,
          });
        }
      }
      processados++;
      setProgresso(input.sessionKey, {
        etapa: "Buscando custos por produto",
        atual: processados,
        total: skusComEntrada.length,
      });
    });

    const produtos: ProdutoRelatorio[] = skusComEntrada
      .map((sku) => {
        const entrada = notas.porSku.get(sku)!;
        const custo = custosPorSku.get(sku);
        const saida = saidas.porSku.get(sku);
        const notasUi: NotaEntradaItem[] = entrada.notas
          .slice()
          .sort((a, b) => a.dataISO.localeCompare(b.dataISO));
        return {
          sku: entrada.sku,
          produto: entrada.nome,
          idProdutoTiny: custo?.idProduto,
          quantidadeTotal: entrada.qtdEntrada,
          valorTotalGeral: entrada.valorEntrada,
          custoMedio: custo?.custoMedio ?? 0,
          ultimoPreco: custo?.ultimoCusto ?? entrada.ultimoPreco,
          ultimaData: entrada.ultimaDataISO,
          saidasNoPeriodo: saida?.total ?? 0,
          numPedidosVenda: saida?.numPedidos ?? 0,
          notas: notasUi,
        };
      })
      .sort((a, b) => a.produto.localeCompare(b.produto, "pt-BR"));

    const resultado: SyncResultadoOk = {
      ok: true,
      produtos,
      meta: {
        totalNotas: notas.totalNotas,
        totalPedidos: saidas.totalPedidos,
        geradoEm: Date.now(),
        cacheado: false,
        errosParciais: [
          ...notas.errosParciais,
          ...saidas.errosParciais,
          ...errosCustos,
        ],
      },
    };

    cachePeriodo.set(chaveCache, resultado);
    limparProgresso(input.sessionKey);
    return resultado;
  } catch (err) {
    limparProgresso(input.sessionKey);
    if (err instanceof TinyAuthError) {
      return {
        ok: false,
        motivo: "auth",
        mensagem:
          err.motivo === "refresh_expired"
            ? "Sessão Tiny expirada — reconecte para continuar."
            : err.motivo === "no_tokens"
            ? "Não conectado ao Tiny."
            : "Falha ao renovar autenticação.",
        precisaRelogar: true,
      };
    }
    const msg = err instanceof Error ? err.message : String(err);
    const rate = msg.toLowerCase().includes("limite") || msg.includes("429");
    return {
      ok: false,
      motivo: rate ? "rate" : "outro",
      mensagem: msg,
    };
  }
}
