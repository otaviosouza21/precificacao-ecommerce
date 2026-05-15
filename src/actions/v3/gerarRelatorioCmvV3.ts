"use server";

import {
  OrigemCusto,
  ProdutoRelatorio,
} from "@/components/RelatorioCustos/tipos";
import { TinyAuthError } from "@/lib/tiny/types";
import { processaLote, resolverIdProdutoPorSku } from "./_helpers";
import { getCustosProdutoV3 } from "./getCustosProdutoV3";
import { getSaidasProdutosV3, SaidaSkuDetalhada } from "./getSaidasProdutosV3";
import { getUltimoCustoHistoricoV3 } from "./getUltimoCustoHistoricoV3";
import { limparProgresso, setProgresso } from "./progressoStore";

export type CmvResultadoOk = {
  ok: true;
  produtos: ProdutoRelatorio[];
  meta: {
    totalPedidos: number;
    totalSkusVendidos: number;
    receitaTotal: number;
    cmvTotal: number;
    margemTotalReais: number;
    margemTotalPercent: number;
    skusSemCusto: number;
    skusComFallback: number;
    geradoEm: number;
    cacheado: boolean;
    errosParciais: string[];
  };
};

export type CmvResultadoErro = {
  ok: false;
  motivo: "auth" | "rate" | "outro";
  mensagem: string;
  precisaRelogar?: boolean;
};

const POOL_RESOLVE = 3;
const POOL_CUSTOS = 3;

const cachePeriodo = new Map<string, CmvResultadoOk>();

export async function gerarRelatorioCmvV3(input: {
  dataInicio: string;
  dataFim: string;
  sessionKey: string;
  forcar?: boolean;
}): Promise<CmvResultadoOk | CmvResultadoErro> {
  const chaveCache = `${input.dataInicio}|${input.dataFim}`;
  if (!input.forcar) {
    const cached = cachePeriodo.get(chaveCache);
    if (cached) {
      return { ...cached, meta: { ...cached.meta, cacheado: true } };
    }
  }

  try {
    await setProgresso(input.sessionKey, {
      etapa: "Iniciando relatório CMV",
      atual: 0,
      total: 0,
    });

    const saidas = await getSaidasProdutosV3({
      skus: [],
      ids: [],
      dataInicio: input.dataInicio,
      dataFim: input.dataFim,
      sessionKey: input.sessionKey,
    });

    if (!saidas.ok) {
      await limparProgresso(input.sessionKey);
      return {
        ok: false,
        motivo: saidas.motivo,
        mensagem: saidas.mensagem,
        precisaRelogar: saidas.precisaRelogar,
      };
    }

    const skusVendidos = Object.keys(saidas.porSku);

    const errosParciais: string[] = [...saidas.errosParciais];

    // 1) Resolver idProduto para SKUs sem candidato
    const skusSemId = skusVendidos.filter(
      (sku) => !saidas.porSku[sku].idProdutoCandidato
    );
    if (skusSemId.length > 0) {
      let proc = 0;
      await setProgresso(input.sessionKey, {
        etapa: "Resolvendo IDs de produtos",
        atual: 0,
        total: skusSemId.length,
      });
      await processaLote(skusSemId, POOL_RESOLVE, async (sku) => {
        const id = await resolverIdProdutoPorSku(sku);
        if (id) saidas.porSku[sku].idProdutoCandidato = id;
        proc++;
        await setProgresso(input.sessionKey, {
          etapa: "Resolvendo IDs de produtos",
          atual: proc,
          total: skusSemId.length,
        });
      });
    }

    // 2) Buscar custo unitário para cada SKU vendido
    type ResolucaoCusto = {
      custoUnitario: number;
      origem: OrigemCusto;
    };
    const custos = new Map<string, ResolucaoCusto>();

    let procCustos = 0;
    await setProgresso(input.sessionKey, {
      etapa: "Buscando custos por produto",
      atual: 0,
      total: skusVendidos.length,
    });

    await processaLote(skusVendidos, POOL_CUSTOS, async (sku) => {
      const dados: SaidaSkuDetalhada = saidas.porSku[sku];
      const idProduto = dados.idProdutoCandidato;
      let res: ResolucaoCusto = {
        custoUnitario: 0,
        origem: "indisponivel",
      };

      if (idProduto) {
        try {
          const periodo = await getCustosProdutoV3({
            idProduto,
            dataInicio: input.dataInicio,
            dataFim: input.dataFim,
          });
          if (periodo && periodo.custoMedio > 0) {
            res = {
              custoUnitario: periodo.custoMedio,
              origem: "periodo",
            };
          }
        } catch (err) {
          errosParciais.push(
            `custos período ${sku}: ${err instanceof Error ? err.message : err}`
          );
        }

        if (res.origem === "indisponivel") {
          try {
            const historico = await getUltimoCustoHistoricoV3(idProduto);
            if (historico && historico.custo > 0) {
              res = {
                custoUnitario: historico.custo,
                origem: "historico",
              };
            }
          } catch (err) {
            errosParciais.push(
              `custos histórico ${sku}: ${err instanceof Error ? err.message : err}`
            );
          }
        }
      } else {
        errosParciais.push(`sem idProduto: ${sku}`);
      }

      custos.set(sku, res);
      procCustos++;
      await setProgresso(input.sessionKey, {
        etapa: "Buscando custos por produto",
        atual: procCustos,
        total: skusVendidos.length,
      });
    });

    // 3) Monta ProdutoRelatorio[]
    let receitaTotal = 0;
    let cmvTotal = 0;
    let skusSemCusto = 0;
    let skusComFallback = 0;

    const produtos: ProdutoRelatorio[] = skusVendidos.map((sku) => {
      const dados = saidas.porSku[sku];
      const custo = custos.get(sku)!;
      const custoUnit = custo.custoUnitario;
      const qtd = dados.total;
      const receita = dados.receita;
      const cmv = qtd * custoUnit;
      const margemReais = receita - cmv;
      const margemPercent = receita > 0 ? (margemReais / receita) * 100 : 0;

      receitaTotal += receita;
      cmvTotal += cmv;
      if (custo.origem === "indisponivel") skusSemCusto++;
      if (custo.origem === "historico") skusComFallback++;

      const itens = dados.itens
        .slice()
        .sort((a, b) => a.dataISO.localeCompare(b.dataISO));

      return {
        sku: dados.sku,
        produto: dados.nome,
        idProdutoTiny: dados.idProdutoCandidato,
        quantidadeTotal: qtd,
        valorTotalGeral: receita,
        custoMedio: custoUnit,
        ultimoPreco: custoUnit,
        ultimaData: "",
        saidasNoPeriodo: qtd,
        numPedidosVenda: dados.numPedidos,
        notas: [],
        custoUnitario: custoUnit,
        origemCusto: custo.origem,
        receita,
        cmv,
        margemReais,
        margemPercent,
        pedidos: itens,
      };
    });

    produtos.sort((a, b) => (b.receita ?? 0) - (a.receita ?? 0));

    const margemTotalReais = receitaTotal - cmvTotal;
    const margemTotalPercent =
      receitaTotal > 0 ? (margemTotalReais / receitaTotal) * 100 : 0;

    const resultado: CmvResultadoOk = {
      ok: true,
      produtos,
      meta: {
        totalPedidos: saidas.totalPedidos,
        totalSkusVendidos: skusVendidos.length,
        receitaTotal,
        cmvTotal,
        margemTotalReais,
        margemTotalPercent,
        skusSemCusto,
        skusComFallback,
        geradoEm: Date.now(),
        cacheado: false,
        errosParciais,
      },
    };

    cachePeriodo.set(chaveCache, resultado);
    await limparProgresso(input.sessionKey);
    return resultado;
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
