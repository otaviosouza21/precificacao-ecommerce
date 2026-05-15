"use server";

import { fetchTinyV3 } from "@/lib/tiny/client";
import { ENDPOINTS } from "@/lib/tiny/endpoints";
import {
  TinyAuthError,
  V3NotaCompleta,
  V3NotasListResponse,
} from "@/lib/tiny/types";
import {
  NotaEntradaItem,
  ProdutoRelatorio,
} from "@/components/RelatorioCustos/tipos";
import { getCustosProdutoV3 } from "./getCustosProdutoV3";
import { limparProgresso, setProgresso } from "./progressoStore";

export type RelatorioProdutosOk = {
  ok: true;
  produtos: ProdutoRelatorio[];
  meta: {
    totalNotas: number;
    geradoEm: number;
    errosParciais: string[];
  };
};

export type RelatorioProdutosErro = {
  ok: false;
  motivo: "auth" | "rate" | "outro";
  mensagem: string;
  precisaRelogar?: boolean;
};

const LIMIT_NOTAS = 100;
const POOL_NOTAS = 3;
const POOL_CUSTOS = 3;

type ProdutoSelecionado = {
  id: string;
  sku: string;
  nome: string;
};

function normalizaSku(s: string): string {
  return s.trim().toLowerCase();
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

export async function getRelatorioProdutosV3(input: {
  produtos: ProdutoSelecionado[];
  dataInicio: string;
  dataFim: string;
  sessionKey: string;
}): Promise<RelatorioProdutosOk | RelatorioProdutosErro> {
  if (input.produtos.length === 0) {
    return { ok: true, produtos: [], meta: { totalNotas: 0, geradoEm: Date.now(), errosParciais: [] } };
  }

  const errosParciais: string[] = [];
  const skusAlvo = new Set(input.produtos.map((p) => normalizaSku(p.sku)));
  const idsAlvo = new Set(input.produtos.filter((p) => p.id).map((p) => p.id));

  type Acumulado = {
    qtd: number;
    valor: number;
    ultimaDataISO: string;
    ultimoPreco: number;
    notas: NotaEntradaItem[];
  };
  const acumulado = new Map<string, Acumulado>();

  function getAcc(sku: string): Acumulado {
    let a = acumulado.get(sku);
    if (!a) {
      a = { qtd: 0, valor: 0, ultimaDataISO: "", ultimoPreco: 0, notas: [] };
      acumulado.set(sku, a);
    }
    return a;
  }

  try {
    await setProgresso(input.sessionKey, { etapa: "Listando notas de entrada", atual: 0, total: 0 });
    const cabecalhos: { id: string; numero: string; dataISO: string }[] = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const resp = await fetchTinyV3<V3NotasListResponse>(ENDPOINTS.NOTAS, {
        query: {
          tipo: "E",
          dataInicial: input.dataInicio,
          dataFinal: input.dataFim,
          limit: LIMIT_NOTAS,
          offset,
        },
      });
      const itens = resp.itens ?? [];
      for (const n of itens) {
        const id = n.id != null ? String(n.id) : "";
        if (!id) continue;
        const dataISO =
          (typeof n.dataEmissao === "string" ? n.dataEmissao.slice(0, 10) : "") ||
          (typeof n.dataInclusao === "string" ? n.dataInclusao.slice(0, 10) : "");
        cabecalhos.push({ id, numero: String(n.numero ?? ""), dataISO });
      }
      total = resp.paginacao?.total ?? cabecalhos.length;
      await setProgresso(input.sessionKey, {
        etapa: "Listando notas de entrada",
        atual: cabecalhos.length,
        total,
      });
      if (itens.length < LIMIT_NOTAS) break;
      offset += LIMIT_NOTAS;
    }

    let processadas = 0;
    await setProgresso(input.sessionKey, {
      etapa: "Filtrando notas pelos produtos",
      atual: 0,
      total: cabecalhos.length,
    });
    await processaLote(cabecalhos, POOL_NOTAS, async (cab) => {
      try {
        const detalhe = await fetchTinyV3<V3NotaCompleta>(ENDPOINTS.NOTA(cab.id));
        const itens = detalhe.itens ?? [];
        for (const it of itens) {
          const idProduto = it.produto?.id != null ? String(it.produto.id) : "";
          const sku = it.produto?.sku || it.produto?.codigo || it.sku || it.codigo || "";
          const skuNorm = normalizaSku(sku);
          const matchId = idProduto && idsAlvo.has(idProduto);
          const matchSku = skuNorm && skusAlvo.has(skuNorm);
          if (!matchId && !matchSku) continue;

          const chave = matchId
            ? input.produtos.find((p) => p.id === idProduto)?.sku.toLowerCase() || skuNorm
            : skuNorm;

          const qtd = Number(it.quantidade) || 0;
          const preco =
            Number(it.valorUnitario) ||
            (Number(it.valorTotal) && qtd ? Number(it.valorTotal) / qtd : 0);
          const valorTotal =
            Number(it.valorTotal) ||
            (qtd && preco ? qtd * preco : Number(it.valor) || 0);

          const acc = getAcc(chave);
          acc.qtd += qtd;
          acc.valor += valorTotal;
          const dataISO = cab.dataISO || "";
          if (dataISO && dataISO >= acc.ultimaDataISO) {
            acc.ultimaDataISO = dataISO;
            acc.ultimoPreco = preco || acc.ultimoPreco;
          }
          acc.notas.push({
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
        await setProgresso(input.sessionKey, {
          etapa: "Filtrando notas pelos produtos",
          atual: processadas,
          total: cabecalhos.length,
        });
      }
    });

    await setProgresso(input.sessionKey, {
      etapa: "Buscando custos por produto",
      atual: 0,
      total: input.produtos.length,
    });

    const custosPorChave = new Map<
      string,
      { custoMedio: number; ultimoCusto: number }
    >();
    let proc = 0;
    await processaLote(input.produtos, POOL_CUSTOS, async (p) => {
      const chave = normalizaSku(p.sku);
      try {
        if (p.id) {
          const resumo = await getCustosProdutoV3({
            idProduto: p.id,
            dataInicio: input.dataInicio,
            dataFim: input.dataFim,
          });
          if (resumo) {
            custosPorChave.set(chave, {
              custoMedio: resumo.custoMedio,
              ultimoCusto: resumo.ultimoCusto,
            });
          }
        }
      } catch (err) {
        errosParciais.push(`custos ${p.sku}: ${err instanceof Error ? err.message : err}`);
      } finally {
        proc++;
        await setProgresso(input.sessionKey, {
          etapa: "Buscando custos por produto",
          atual: proc,
          total: input.produtos.length,
        });
      }
    });

    const produtos: ProdutoRelatorio[] = input.produtos.map((p) => {
      const chave = normalizaSku(p.sku);
      const acc = acumulado.get(chave);
      const custo = custosPorChave.get(chave);
      const fallbackMedio =
        acc && acc.qtd > 0 ? acc.valor / acc.qtd : 0;
      return {
        sku: p.sku,
        produto: p.nome,
        idProdutoTiny: p.id || undefined,
        quantidadeTotal: acc?.qtd ?? 0,
        valorTotalGeral: acc?.valor ?? 0,
        custoMedio: custo?.custoMedio ?? fallbackMedio,
        ultimoPreco: custo?.ultimoCusto ?? acc?.ultimoPreco ?? 0,
        ultimaData: acc?.ultimaDataISO ?? "",
        saidasNoPeriodo: 0,
        numPedidosVenda: 0,
        notas: (acc?.notas ?? []).sort((a, b) =>
          a.dataISO.localeCompare(b.dataISO)
        ),
      };
    });

    await limparProgresso(input.sessionKey);

    return {
      ok: true,
      produtos,
      meta: {
        totalNotas: 0,
        geradoEm: Date.now(),
        errosParciais,
      },
    };
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
      motivo: msg.includes("429") || msg.toLowerCase().includes("limite") ? "rate" : "outro",
      mensagem: msg,
    };
  }
}
