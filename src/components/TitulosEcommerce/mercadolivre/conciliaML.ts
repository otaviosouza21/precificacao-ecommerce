import type { TitulosReceberApiTiny } from "@/api/types/api-types";
import type { RecebimentoML } from "./parseReserveML";

/**
 * Conciliação Mercado Livre × Tiny.
 *
 * Duas diferenças fundamentais em relação à rotina da Shopee:
 *
 * 1. Não há previsão de taxa. O relatório traz a taxa realizada, então a
 *    conferência é `Σ títulos − recebido = taxas`, não uma tabela de faixas.
 *
 * 2. Um pedido pode ter VÁRIOS títulos. Quando o comprador parcela, o Tiny cria
 *    um título por parcela (vencendo mês a mês), mas o Mercado Livre libera o
 *    valor inteiro de uma vez só. Verificado: 263 de 263 operações parceladas
 *    foram liberadas numa única data. Por isso a unidade de conciliação aqui é
 *    o PEDIDO, não o título.
 */

/** Um título do Tiny já com a parcela interpretada. */
export interface TituloML {
  id: string;
  valor: number;
  historico: string;
  cliente: string;
  numero_doc: string;
  data_emissao: string;
  /** Ex.: "1/5" quando o histórico traz "(parcela 1/5)". */
  parcela: string | null;
  parcelaNum: number | null;
  parcelaTotal: number | null;
}

export type StatusConciliacao =
  | "ok"
  | "divergente"
  | "estornado"
  | "parcelas_faltando";

export interface ConciliacaoML {
  pedido: string;
  recebimento: RecebimentoML;
  titulos: TituloML[];
  /** Soma dos títulos em aberto do pedido. */
  valor_titulos: number;
  valor_recebido: number;
  /** O que o Tiny precisa em `valorTaxas` na baixa. */
  valor_taxas: number;
  status: StatusConciliacao;
  /** Quando o Tiny gerou N parcelas mas nem todas estão em aberto. */
  parcelasEsperadas: number | null;
  /** Motivo legível quando o status não é "ok". */
  observacao?: string;
}

export interface ResultadoConciliacaoML {
  conciliados: ConciliacaoML[];
  /** Recebimentos sem nenhum título correspondente no Tiny. */
  semTitulo: RecebimentoML[];
  /** Títulos de ML em aberto que não apareceram no relatório. */
  semRecebimento: { pedido: string; titulos: TituloML[]; valor: number }[];
}

/** Captura o ID de 16 dígitos do Mercado Livre no histórico do título. */
const RE_ID_ML = /\b(\d{16})\b/;
/** Captura "(parcela 2/5)". */
const RE_PARCELA = /\(parcela\s*(\d+)\s*\/\s*(\d+)\)/i;

/**
 * Identifica se o título é de venda Mercado Livre.
 * A Shopee usa order_sn alfanumérico (ex.: 260910NJP3X1T4); o ML usa 16 dígitos.
 * Por isso a simples presença de um número de 16 dígitos separa os dois canais.
 */
export function extraiIdML(historico: string): string | null {
  const m = RE_ID_ML.exec(historico || "");
  return m ? m[1] : null;
}

function interpretaTitulo(c: TitulosReceberApiTiny["conta"]): TituloML {
  const historico = c.historico || "";
  const mp = RE_PARCELA.exec(historico);
  return {
    id: c.id,
    valor: +parseFloat(c.valor || "0").toFixed(2),
    historico,
    cliente: c.nome_cliente || "",
    numero_doc: c.numero_doc || "",
    data_emissao: c.data_emissao || "",
    parcela: mp ? `${mp[1]}/${mp[2]}` : null,
    parcelaNum: mp ? Number(mp[1]) : null,
    parcelaTotal: mp ? Number(mp[2]) : null,
  };
}

/**
 * Agrupa os títulos em aberto do Tiny por pedido do Mercado Livre.
 * Títulos sem ID de 16 dígitos (Shopee) são ignorados.
 */
export function agrupaTitulosPorPedido(
  titulos: TitulosReceberApiTiny[],
): Map<string, TituloML[]> {
  const mapa = new Map<string, TituloML[]>();
  for (const t of titulos) {
    const id = extraiIdML(t.conta?.historico || "");
    if (!id) continue;
    const lista = mapa.get(id) ?? [];
    lista.push(interpretaTitulo(t.conta));
    mapa.set(id, lista);
  }
  // Ordena por número da parcela, para a tela exibir 1/5, 2/5, ...
  for (const lista of mapa.values()) {
    lista.sort((a, b) => (a.parcelaNum ?? 0) - (b.parcelaNum ?? 0));
  }
  return mapa;
}

/** Tolerância de 1 centavo, igual à rotina da Shopee (arredondamento do marketplace). */
const TOLERANCIA = 0.01;

export function conciliaML(
  recebimentos: RecebimentoML[],
  titulosTiny: TitulosReceberApiTiny[],
): ResultadoConciliacaoML {
  const porPedido = agrupaTitulosPorPedido(titulosTiny);

  const conciliados: ConciliacaoML[] = [];
  const semTitulo: RecebimentoML[] = [];
  const usados = new Set<string>();

  for (const rec of recebimentos) {
    const titulos = porPedido.get(rec.pedido);

    if (!titulos || titulos.length === 0) {
      semTitulo.push(rec);
      continue;
    }
    usados.add(rec.pedido);

    const valor_titulos = +titulos
      .reduce((acc, t) => acc + t.valor, 0)
      .toFixed(2);
    const valor_recebido = rec.valor_recebido;
    const valor_taxas = +(valor_titulos - valor_recebido).toFixed(2);

    // Quantas parcelas o Tiny gerou originalmente (vem do "(parcela x/N)").
    const parcelasEsperadas = titulos[0]?.parcelaTotal ?? null;
    const faltamParcelas =
      parcelasEsperadas !== null && titulos.length < parcelasEsperadas;

    let status: StatusConciliacao;
    let observacao: string | undefined;

    if (rec.estornado) {
      status = "estornado";
      observacao =
        "Venda cancelada ou contestada: o dinheiro entrou e saiu, saldo líquido zero.";
    } else if (faltamParcelas) {
      status = "parcelas_faltando";
      observacao =
        `O Tiny gerou ${parcelasEsperadas} parcelas, mas só ${titulos.length} ` +
        `está(ão) em aberto. Baixar só parte do pedido deixaria o saldo errado.`;
    } else if (Math.abs(valor_titulos - rec.valor_bruto) > TOLERANCIA) {
      status = "divergente";
      observacao =
        `A soma dos títulos (${valor_titulos.toFixed(2)}) não bate com o valor ` +
        `bruto da operação no Mercado Livre (${rec.valor_bruto.toFixed(2)}).`;
    } else {
      status = "ok";
    }

    conciliados.push({
      pedido: rec.pedido,
      recebimento: rec,
      titulos,
      valor_titulos,
      valor_recebido,
      valor_taxas,
      status,
      parcelasEsperadas,
      observacao,
    });
  }

  // Títulos de ML em aberto que o relatório não cobriu — normalmente pedidos
  // cujo dinheiro será liberado num período fora do arquivo carregado.
  const semRecebimento: ResultadoConciliacaoML["semRecebimento"] = [];
  for (const [pedido, titulos] of porPedido) {
    if (usados.has(pedido)) continue;
    semRecebimento.push({
      pedido,
      titulos,
      valor: +titulos.reduce((a, t) => a + t.valor, 0).toFixed(2),
    });
  }

  // Mais recente primeiro: é o que o usuário quer conferir.
  conciliados.sort((a, b) =>
    b.recebimento.data_liberacao.localeCompare(a.recebimento.data_liberacao),
  );

  return { conciliados, semTitulo, semRecebimento };
}

/** Percentual efetivo de taxa sobre o bruto — substitui a previsão da Shopee. */
export function taxaEfetiva(c: ConciliacaoML): number {
  const base = c.recebimento.valor_bruto;
  if (!base) return 0;
  return +((100 * c.valor_taxas) / base).toFixed(1);
}

/* -------------------------------------------------------------------------- */
/*  MODO CONFERÊNCIA — períodos anteriores à ativação da integração            */
/* -------------------------------------------------------------------------- */

/**
 * Data a partir da qual se ESPERA que toda venda tenha conta a receber no Tiny.
 *
 * Não decide o regime da operação — isso é `separaPorPresenca`, pela presença
 * real do título. Esta data serve para detectar o contrário: venda posterior a
 * ela que chegou SEM título é anomalia, porque a integração deveria ter gerado.
 *
 * Medido em 13/10/2026: o Tiny emitiu o primeiro título de ML em 29/09, e das
 * 84 vendas de outubro no relatório apenas 16 tinham título — 68 pedidos
 * existem no ERP sem financeiro. É esse buraco que a data expõe.
 */
export const INICIO_GERACAO_TITULOS = "2026-10-01";

export type ModoOperacao = "conferencia" | "titulo";

/**
 * Separa as operações pelos dois regimes, pela PRESENÇA de título no Tiny.
 *
 * A primeira versão cortava por data ("antes de X é conferência"), e os dados
 * mostraram que qualquer data erra nas duas pontas. Medido no relatório de
 * 01–13/10/2026, com corte em 12/10: de 603 operações, 17 iriam para
 * conferência tendo título, e 44 iriam para conciliação sem ter — 61
 * classificações erradas.
 *
 * A presença do título não erra: ela é o próprio fato que decide se há o que
 * conciliar. Também se auto-corrige quando um pedido antigo ganha título
 * depois, ou quando um recente não gera.
 */
export function separaPorPresenca(
  recebimentos: RecebimentoML[],
  titulosPorPedido: Map<string, TituloML[]>,
): { conferencia: RecebimentoML[]; titulo: RecebimentoML[] } {
  const conferencia: RecebimentoML[] = [];
  const titulo: RecebimentoML[] = [];
  for (const r of recebimentos) {
    const temTitulo = (titulosPorPedido.get(r.pedido)?.length ?? 0) > 0;
    (temTitulo ? titulo : conferencia).push(r);
  }
  return { conferencia, titulo };
}

/** Resumo do pedido do Tiny, como vem de `buscarPedidosML`. */
export interface PedidoTinyResumo {
  numero: string;
  valor: number;
  situacao: string;
  cliente: string;
  data_pedido: string;
}

export type StatusConferencia =
  | "confere"
  | "divergente"
  | "estornado"
  | "sem_pedido"
  /** Venda posterior ao início da geração que chegou sem título: a integração falhou. */
  | "titulo_faltando"
  /** A busca de pedidos no Tiny veio incompleta — não dá para afirmar nada. */
  | "nao_verificado";

export interface ItemConferencia {
  pedido: string;
  recebimento: RecebimentoML;
  /** null quando o pedido não existe no Tiny no período consultado. */
  pedidoTiny: PedidoTinyResumo | null;
  /** Valor do pedido no Tiny; 0 quando não encontrado. */
  valor_pedido: number;
  valor_recebido: number;
  /** Quanto o Mercado Livre reteve: bruto do relatório − líquido creditado. */
  valor_taxas: number;
  status: StatusConferencia;
  observacao?: string;
}

export interface ResultadoConferenciaML {
  itens: ItemConferencia[];
  /** Pedidos de ML no Tiny do período que não apareceram no relatório. */
  semRecebimento: { pedido: string; pedidoTiny: PedidoTinyResumo }[];
}

/**
 * Confere os recebimentos contra os PEDIDOS do Tiny.
 *
 * É a pergunta que originou o projeto, respondida sem precisar de título:
 * o valor bruto que o Mercado Livre usou como base bate com o valor do pedido?
 */
export function conferenciaML(
  recebimentos: RecebimentoML[],
  pedidos: Record<string, PedidoTinyResumo>,
  opcoes: {
    /**
     * false quando a varredura de pedidos no Tiny falhou no meio. Sem isso, um
     * pedido ausente do mapa parcial seria reportado como "sem_pedido" — uma
     * afirmação falsa, indistinguível de uma ausência real.
     */
    pedidosCompletos?: boolean;
  } = {},
): ResultadoConferenciaML {
  const completos = opcoes.pedidosCompletos !== false;
  const itens: ItemConferencia[] = [];
  const vistos = new Set<string>();

  for (const rec of recebimentos) {
    const pedidoTiny = pedidos[rec.pedido] ?? null;
    if (pedidoTiny) vistos.add(rec.pedido);

    const valor_pedido = pedidoTiny?.valor ?? 0;
    const valor_taxas = +(rec.valor_bruto - rec.valor_recebido).toFixed(2);

    let status: StatusConferencia;
    let observacao: string | undefined;

    if (!pedidoTiny && !completos) {
      status = "nao_verificado";
      observacao =
        "A busca de pedidos no Tiny não terminou. Recarregue antes de concluir " +
        "qualquer coisa sobre esta operação.";
    } else if (!pedidoTiny) {
      status = "sem_pedido";
      observacao =
        "Não há pedido com este número no Tiny dentro do período consultado.";
    } else if (rec.estornado) {
      status = "estornado";
      observacao =
        pedidoTiny.situacao.toLowerCase().includes("cancel")
          ? "Pedido cancelado no Tiny e estornado no Mercado Livre — coerente."
          : `O dinheiro entrou e saiu, mas o pedido está como "${pedidoTiny.situacao}" no Tiny.`;
    } else if (Math.abs(valor_pedido - rec.valor_bruto) > TOLERANCIA) {
      status = "divergente";
      observacao =
        `O valor do pedido no Tiny (${valor_pedido.toFixed(2)}) não bate com o ` +
        `valor bruto usado pelo Mercado Livre (${rec.valor_bruto.toFixed(2)}).`;
    } else if (rec.data_origem && rec.data_origem >= INICIO_GERACAO_TITULOS) {
      // O pedido existe e os valores batem, mas não gerou conta a receber —
      // e a venda é posterior à ativação da integração. Não deveria acontecer.
      status = "titulo_faltando";
      observacao =
        `Venda de ${rec.data_origem} (após ${INICIO_GERACAO_TITULOS}), pedido ` +
        `${pedidoTiny.numero} existe no Tiny mas não gerou conta a receber.`;
    } else {
      status = "confere";
    }

    itens.push({
      pedido: rec.pedido,
      recebimento: rec,
      pedidoTiny,
      valor_pedido,
      valor_recebido: rec.valor_recebido,
      valor_taxas,
      status,
      observacao,
    });
  }

  const semRecebimento = Object.entries(pedidos)
    .filter(([id]) => !vistos.has(id))
    .map(([pedido, pedidoTiny]) => ({ pedido, pedidoTiny }));

  itens.sort((a, b) =>
    b.recebimento.data_liberacao.localeCompare(a.recebimento.data_liberacao),
  );

  return { itens, semRecebimento };
}

/** Taxa efetiva da conferência — mesma leitura, sem depender de título. */
export function taxaEfetivaConferencia(i: ItemConferencia): number {
  const base = i.recebimento.valor_bruto;
  if (!base) return 0;
  return +((100 * i.valor_taxas) / base).toFixed(1);
}
