/**
 * Parser do relatório "Liberações" do Mercado Pago (exportado com todas as colunas).
 *
 * Diferente da Shopee, aqui NÃO existe previsão de taxa: o Mercado Livre não tem
 * tabela de faixas previsível (a comissão varia por categoria, tipo de anúncio e
 * critérios comerciais, e o custo fixo depende de peso/cubagem/logística). Em
 * compensação o relatório já traz a taxa realizada, decomposta em tarifa, custo
 * de envio e tarifa de parcelamento — e a conta fecha sozinha:
 *
 *   bruto + tarifa + parcelamento + envio + impostos = líquido creditado
 *
 * Verificado em 799/799 operações de agosto/2026.
 */

/** Uma operação de recebimento, já agrupada (uma operação pode ter várias linhas). */
export interface RecebimentoML {
  /** Chave unificada: ID DO PACOTE quando existe, senão ID DO PEDIDO. */
  pedido: string;
  /** true quando a chave veio do ID DO PACOTE (importa para diagnóstico). */
  viaPacote: boolean;
  valor_bruto: number;
  /** Σ(crédito) − Σ(débito). É o que de fato entrou na conta. */
  valor_recebido: number;
  /** Valores negativos, como vêm no relatório. */
  tarifa: number;
  custo_envio: number;
  tarifa_parcelamento: number;
  cupom: number;
  /** Parcelas escolhidas pelo COMPRADOR — o vendedor recebe tudo de uma vez. */
  parcelas_comprador: number;
  /** YYYY-MM-DD */
  data_liberacao: string;
  /** YYYY-MM-DD — quando a venda aconteceu. Delimita a busca de pedidos no Tiny. */
  data_origem: string;
  sku: string;
  anuncio: string;
  descricao_produto: string;
  /** Quantas linhas do relatório compõem esta operação. */
  linhas: number;
  /** Tipos de movimento encontrados (Pagamento, Mediação, Devolução...). */
  tipos: string[];
  /** Líquido zero: venda cancelada/contestada. Nunca pode ser baixada. */
  estornado: boolean;
  /** IDs da operação no Mercado Pago (dedup entre relatórios). */
  operacoes: string[];
}

export type PlanilhaML = (string | number | null)[][];

/** Erro tratável de estrutura da planilha (a tela exibe ao usuário). */
export class PlanilhaMLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanilhaMLError";
  }
}

/**
 * Colunas lidas POR NOME, nunca por posição — o relatório do Mercado Pago tem
 * colunas configuráveis em "Ajustes", então a ordem e a quantidade variam.
 */
const COLS = {
  // Obrigatórias: sem estas o relatório não serve.
  pedido: "ID DO PEDIDO",
  descricao: "DESCRIÇÃO",
  bruto: "VALOR BRUTO DA OPERAÇÃO",
  credito: "VALOR LÍQUIDO CREDITADO",
  debito: "VALOR LÍQUIDO DEBITADO",
  // Opcionais, mas que mudam muito a qualidade do resultado.
  pacote: "ID DO PACOTE",
  referencia: "CÓDIGO DE REFERÊNCIA",
  operacao: "ID DA OPERAÇÃO NO MERCADO PAGO",
  tarifa: "TARIFA DO MERCADO PAGO OU DO MERCADO LIVRE",
  envio: "CUSTO DE ENVIO",
  parcelamento: "TARIFA POR OFERECER PARCELAMENTO SEM JUROS",
  liberacaoCurta: "DATA DE LIBERAÇÃO CURTA",
  liberacao: "DATA DE LIBERAÇÃO",
  origem: "DATA DE ORIGEM",
  sku: "CÓDIGO SKU DO PRODUTO",
  anuncio: "CÓDIGO DO PRODUTO",
  detalhe: "DETALHE DA VENDA",
  cupom: "CUPOM DE DESCONTO",
  parcelas: "PARCELAS",
  canal: "CANAL DE VENDA",
} as const;

/** Sem estas o arquivo é outro relatório, não o de Liberações com colunas completas. */
const OBRIGATORIAS = [
  COLS.descricao,
  COLS.bruto,
  COLS.credito,
  COLS.debito,
];

/**
 * Colunas que não são obrigatórias para parsear, mas sem as quais a conta não
 * fecha. A tela avisa o usuário para reexportar com "Ajustes → todas as colunas".
 */
const RECOMENDADAS = [COLS.pacote, COLS.envio];

type ColIndex = Record<string, number>;

/** Converte célula em número, tolerando "-", vazio, null e vírgula decimal. */
function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const limpo = String(value).trim().replace(/\./g, "").replace(",", ".");
  if (limpo === "" || limpo === "-") return 0;
  // Reprocessa: o relatório usa ponto como decimal ("156.99"), não separador de milhar.
  const direto = parseFloat(String(value).trim().replace(",", "."));
  return isNaN(direto) ? (isNaN(parseFloat(limpo)) ? 0 : parseFloat(limpo)) : direto;
}

function texto(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** O relatório escapa o título do produto como """Nome do produto""". */
function limpaTexto(value: string | number | null | undefined): string {
  return texto(value).replace(/^"+|"+$/g, "").trim();
}

/** Aceita só ID de pedido do Mercado Livre: 16 dígitos. */
const ehIdML = (v: string) => /^\d{16}$/.test(v);

function encontraLinhaCabecalho(dados: PlanilhaML): number {
  return dados.findIndex(
    (linha) =>
      Array.isArray(linha) &&
      linha.some((c) => texto(c) === COLS.pedido || texto(c) === COLS.descricao),
  );
}

function montaColIndex(linha: (string | number | null)[]): ColIndex {
  const idx: ColIndex = {};
  linha.forEach((nome, i) => {
    const chave = texto(nome);
    if (chave !== "" && idx[chave] === undefined) idx[chave] = i;
  });
  return idx;
}

function validaCabecalhos(idx: ColIndex): void {
  const faltando = OBRIGATORIAS.filter((n) => idx[n] === undefined);
  if (faltando.length > 0) {
    throw new PlanilhaMLError(
      `A planilha não contém a(s) coluna(s) obrigatória(s): ${faltando
        .map((n) => `"${n}"`)
        .join(", ")}. ` +
        `Gere o relatório "Liberações" no Mercado Pago e, antes de exportar, ` +
        `abra "Ajustes" e marque todas as colunas disponíveis.`,
    );
  }
}

export interface ResultadoParseML {
  recebimentos: RecebimentoML[];
  /** Faixa de datas de venda — delimita a busca de pedidos no Tiny. */
  periodoOrigem: { de: string; ate: string } | null;
  /** Colunas recomendadas que faltaram — a tela avisa, mas não bloqueia. */
  avisos: string[];
  /** Linhas descartadas por não terem chave de pedido (saldo inicial, saques). */
  descartadas: number;
}

export default function parseReserveML(dados: PlanilhaML): ResultadoParseML {
  const linhaCab = encontraLinhaCabecalho(dados);
  if (linhaCab === -1) {
    throw new PlanilhaMLError(
      `Não foi possível localizar o cabeçalho da planilha (coluna "${COLS.pedido}" não encontrada). ` +
        `Confirme que o arquivo é o relatório "Liberações" do Mercado Pago.`,
    );
  }

  const idx = montaColIndex(dados[linhaCab] as (string | number | null)[]);
  validaCabecalhos(idx);

  const avisos: string[] = [];
  const semRecomendada = RECOMENDADAS.filter((n) => idx[n] === undefined);
  if (semRecomendada.includes(COLS.pacote)) {
    avisos.push(
      `A coluna "${COLS.pacote}" não está no arquivo. Sem ela, os pedidos que o Tiny ` +
        `registrou pelo número do pacote não vão conciliar (cerca de 70% do volume).`,
    );
  }
  if (idx[COLS.pedido] === undefined && idx[COLS.referencia] !== undefined) {
    avisos.push(
      `A coluna "${COLS.pedido}" não está no arquivo; usando "${COLS.referencia}" ` +
        `como substituta. Funciona na maioria dos casos, mas reexportar com todas ` +
        `as colunas é mais seguro.`,
    );
  }
  if (semRecomendada.includes(COLS.envio)) {
    avisos.push(
      `A coluna "${COLS.envio}" não está no arquivo. Sem ela o detalhamento das taxas ` +
        `fica incompleto (o frete é descontado do recebido mas não aparece).`,
    );
  }

  const get = (linha: (string | number | null)[], col: string) =>
    idx[col] === undefined ? undefined : linha[idx[col]];

  const grupos = new Map<string, RecebimentoML>();
  let descartadas = 0;

  for (const linha of dados.slice(linhaCab + 1)) {
    if (!Array.isArray(linha) || linha.length === 0) continue;

    // Chave unificada. O Tiny grava ora o pacote, ora o pedido — o relatório traz
    // os dois, e é isso que permite casar 100% das operações.
    const pacote = texto(get(linha, COLS.pacote));
    const pedidoId = texto(get(linha, COLS.pedido));
    // `CÓDIGO DE REFERÊNCIA` repete o ID DO PEDIDO em 1.100 de 1.123 linhas
    // medidas; serve de rede quando a exportação sai sem a coluna do pedido.
    const referencia = texto(get(linha, COLS.referencia));
    const chave = ehIdML(pacote)
      ? pacote
      : ehIdML(pedidoId)
        ? pedidoId
        : ehIdML(referencia)
          ? referencia
          : null;

    // Sem chave: saldo inicial, saques, transferências. Não são venda.
    if (!chave) {
      descartadas++;
      continue;
    }

    const atual = grupos.get(chave);
    const base: RecebimentoML = atual ?? {
      pedido: chave,
      viaPacote: ehIdML(pacote),
      valor_bruto: 0,
      valor_recebido: 0,
      tarifa: 0,
      custo_envio: 0,
      tarifa_parcelamento: 0,
      cupom: 0,
      parcelas_comprador: 1,
      data_liberacao: "",
      data_origem: "",
      sku: "",
      anuncio: "",
      descricao_produto: "",
      linhas: 0,
      tipos: [],
      estornado: false,
      operacoes: [],
    };

    base.valor_bruto += toNumber(get(linha, COLS.bruto));
    base.valor_recebido +=
      toNumber(get(linha, COLS.credito)) - toNumber(get(linha, COLS.debito));
    base.tarifa += toNumber(get(linha, COLS.tarifa));
    base.custo_envio += toNumber(get(linha, COLS.envio));
    base.tarifa_parcelamento += toNumber(get(linha, COLS.parcelamento));
    base.cupom += toNumber(get(linha, COLS.cupom));
    base.linhas += 1;

    const tipo = texto(get(linha, COLS.descricao));
    if (tipo && !base.tipos.includes(tipo)) base.tipos.push(tipo);

    const op = texto(get(linha, COLS.operacao));
    if (op && !base.operacoes.includes(op)) base.operacoes.push(op);

    const parcelas = toNumber(get(linha, COLS.parcelas));
    if (parcelas > base.parcelas_comprador) base.parcelas_comprador = parcelas;

    // Data de liberação: prefere a versão curta (já YYYY-MM-DD); senão corta a ISO.
    const curta = texto(get(linha, COLS.liberacaoCurta));
    const longa = texto(get(linha, COLS.liberacao));
    const data = curta || longa.slice(0, 10);
    // Mantém a MAIOR data: numa operação com estorno, vale a última movimentação.
    if (data && data > base.data_liberacao) base.data_liberacao = data;

    // Origem: mantém a MENOR, que é quando a venda de fato aconteceu.
    const origem = texto(get(linha, COLS.origem)).slice(0, 10);
    if (origem && (!base.data_origem || origem < base.data_origem)) {
      base.data_origem = origem;
    }

    if (!base.sku) base.sku = texto(get(linha, COLS.sku));
    if (!base.anuncio) base.anuncio = texto(get(linha, COLS.anuncio));
    if (!base.descricao_produto) {
      base.descricao_produto = limpaTexto(get(linha, COLS.detalhe));
    }

    grupos.set(chave, base);
  }

  const recebimentos = [...grupos.values()].map((r) => {
    // Arredonda depois de somar, para não acumular erro de ponto flutuante.
    const round = (v: number) => +v.toFixed(2);
    const valor_recebido = round(r.valor_recebido);
    return {
      ...r,
      valor_bruto: round(r.valor_bruto),
      valor_recebido,
      tarifa: round(r.tarifa),
      custo_envio: round(r.custo_envio),
      tarifa_parcelamento: round(r.tarifa_parcelamento),
      cupom: round(r.cupom),
      // Estorno: entrou e saiu. São vendas canceladas/contestadas.
      estornado: Math.abs(valor_recebido) < 0.01,
    };
  });

  recebimentos.sort((a, b) => a.data_liberacao.localeCompare(b.data_liberacao));

  const origens = recebimentos
    .map((r) => r.data_origem)
    .filter(Boolean)
    .sort();
  const periodoOrigem =
    origens.length > 0
      ? { de: origens[0], ate: origens[origens.length - 1] }
      : null;

  return { recebimentos, periodoOrigem, avisos, descartadas };
}
