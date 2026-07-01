export interface ObjetoPlanilhaFinal {
  id_ecommerce: string;
  sku: string;
  nome_anuncio: string;
  dt_criacao_pedido: string;
  dt_conclusao: string;
  valor_recebido: string;
  preco_com_rebate: number;
  cupom_rebate: number;
  taxa_afiliados: number;
  subisidio_pix: number;
}

// A aba "Renda" é lida como array de arrays (XLSX header: 1).
export type PlanilhaXlsx = (string | number | null)[][];

// Erro tratável para sinalizar problemas de estrutura da planilha (ReadXlsx exibe ao usuário).
export class PlanilhaShopeeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanilhaShopeeError";
  }
}

/**
 * Cabeçalhos esperados na aba "Renda" da Shopee.
 * As colunas são lidas POR NOME (não por posição), para resistir a inserções/
 * reordenações de colunas feitas pela Shopee.
 */
const HEADERS = {
  ver: "Ver", // tipo da linha: "Order" (nível pedido) ou "Sku" (nível item)
  id_ecommerce: "ID do pedido",
  sku: "SKU", // código do produto (linha "Sku") — chave p/ casar com a API de produtos
  nome_anuncio: "Nome do produto",
  dt_criacao_pedido: "Data de criação do pedido",
  dt_conclusao: "Data de conclusão do pagamento",
  valor_recebido: "Quantia total lançada (R$)",
  // Preço do produto já com o rebate aplicado (o preço original só existe no título do Tiny).
  preco_produto: "Preço do produto",
  taxa_afiliados: "Taxa de comissão Afiliados do Vendedor",
  // Campos a nível de pedido: só preenchidos na linha "Order" (na "Sku" vêm "-").
  subisidio_pix: "Ajuste por pagamento via PIX",
  cupom_rebate: "Incentivo de cupom",
} as const;

type ColIndex = Record<string, number>;

/** Converte célula da planilha em número, tratando "-", "", vírgula decimal e null → 0. */
function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const limpo = String(value).trim().replace(",", ".");
  if (limpo === "" || limpo === "-") return 0;
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function texto(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Localiza a linha de cabeçalho (a que contém "ID do pedido"). */
function encontraLinhaCabecalho(planilhaData: PlanilhaXlsx): number {
  return planilhaData.findIndex(
    (linha) => Array.isArray(linha) && linha.includes(HEADERS.id_ecommerce),
  );
}

/** Monta o mapa nome do cabeçalho → índice da coluna (primeira ocorrência). */
function montaColIndex(linhaCabecalho: (string | number | null)[]): ColIndex {
  const colIndex: ColIndex = {};
  linhaCabecalho.forEach((nome, i) => {
    const chave = texto(nome).trim();
    if (chave !== "" && colIndex[chave] === undefined) {
      colIndex[chave] = i;
    }
  });
  return colIndex;
}

/** Garante que todos os cabeçalhos esperados existam; senão lança erro tratável. */
function validaCabecalhos(colIndex: ColIndex): void {
  const faltando = Object.values(HEADERS).filter(
    (nome) => colIndex[nome] === undefined,
  );
  if (faltando.length > 0) {
    throw new PlanilhaShopeeError(
      `A aba "Renda" não contém a(s) coluna(s) esperada(s): ${faltando
        .map((n) => `"${n}"`)
        .join(", ")}. A estrutura da planilha da Shopee pode ter mudado.`,
    );
  }
}

export default function LimpaJsonShopee(
  planilhaData: PlanilhaXlsx,
): ObjetoPlanilhaFinal[] {
  const linhaCabecalho = encontraLinhaCabecalho(planilhaData);
  if (linhaCabecalho === -1) {
    throw new PlanilhaShopeeError(
      `Não foi possível localizar o cabeçalho da aba "Renda" (coluna "${HEADERS.id_ecommerce}" não encontrada).`,
    );
  }

  const colIndex = montaColIndex(
    planilhaData[linhaCabecalho] as (string | number | null)[],
  );
  validaCabecalhos(colIndex);

  const linhasDados = planilhaData.slice(linhaCabecalho + 1);

  // Mapa de linhas "Order" por ID do pedido (carregam os valores a nível de pedido).
  const orderPorId = new Map<string, (string | number | null)[]>();
  linhasDados.forEach((linha) => {
    if (texto(linha[colIndex[HEADERS.ver]]) === "Order") {
      const id = texto(linha[colIndex[HEADERS.id_ecommerce]]);
      if (id && !orderPorId.has(id)) orderPorId.set(id, linha);
    }
  });

  const linhasSku = linhasDados.filter(
    (linha) => texto(linha[colIndex[HEADERS.ver]]) === "Sku",
  );

  return montaObjetoPlanilha(linhasSku, orderPorId, colIndex);
}

export function montaObjetoPlanilha(
  linhasSku: PlanilhaXlsx,
  orderPorId: Map<string, (string | number | null)[]>,
  colIndex: ColIndex,
): ObjetoPlanilhaFinal[] {
  const get = (linha: (string | number | null)[], header: string) =>
    linha[colIndex[header]];

  return linhasSku.map((sku) => {
    const id = texto(get(sku, HEADERS.id_ecommerce));
    // Valores a nível de pedido vêm da linha "Order" (na "Sku" vêm "-").
    const order = orderPorId.get(id) ?? sku;

    return {
      id_ecommerce: id,
      sku: texto(get(sku, HEADERS.sku)).trim(),
      nome_anuncio: texto(get(sku, HEADERS.nome_anuncio)),
      dt_criacao_pedido: texto(get(sku, HEADERS.dt_criacao_pedido)),
      dt_conclusao: texto(get(sku, HEADERS.dt_conclusao)),
      valor_recebido: texto(get(sku, HEADERS.valor_recebido)),
      preco_com_rebate: toNumber(get(sku, HEADERS.preco_produto)),
      cupom_rebate: toNumber(get(order, HEADERS.cupom_rebate)),
      taxa_afiliados: toNumber(get(sku, HEADERS.taxa_afiliados)),
      subisidio_pix: toNumber(get(order, HEADERS.subisidio_pix)),
    };
  });
}
