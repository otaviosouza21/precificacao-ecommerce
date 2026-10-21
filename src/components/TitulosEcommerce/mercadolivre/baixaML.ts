import type { BaixaTituloParams } from "@/actions/baixaTituloTiny";
import type { ConciliacaoML } from "./conciliaML";

/**
 * Montagem da baixa de um pedido do Mercado Livre.
 *
 * A diferença para a Shopee é que aqui UM recebimento quita VÁRIOS títulos.
 * Quando o comprador parcela, o Tiny cria um título por parcela (vencendo mês a
 * mês), mas o Mercado Livre deposita o valor inteiro de uma vez — verificado em
 * 263 de 263 operações parceladas, todas liberadas numa única data.
 *
 * Consequência: baixar só a primeira parcela deixaria as outras abertas para
 * sempre, porque nunca mais vai entrar dinheiro referente a elas. As parcelas
 * têm de ser baixadas juntas, na data da liberação.
 */

export const CATEGORIA_BAIXA_ML = "Venda Mercado Livre";
/**
 * Conta financeira do Tiny onde o recebimento do ML é lançado. Tem de bater
 * EXATAMENTE com o cadastro no Tiny — a API v2 não devolve a conta depois da
 * baixa, então a grafia só se confirma olhando a primeira baixa no ERP.
 */
export const CONTA_DESTINO_ML = "Caixa Mercado Livre";

/** Só pedido conferido pode ser baixado. */
export function podeBaixar(item: ConciliacaoML): boolean {
  return item.status === "ok";
}

export function motivoBloqueio(item: ConciliacaoML): string | null {
  switch (item.status) {
    case "ok":
      return null;
    case "estornado":
      return "Venda estornada: o dinheiro entrou e saiu. Não há o que baixar.";
    case "parcelas_faltando":
      return "Faltam parcelas em aberto. Baixar parte do pedido deixaria o saldo errado.";
    case "divergente":
      return "A soma dos títulos não bate com o valor da operação no Mercado Livre.";
    default:
      return "Pedido não conferido.";
  }
}

/**
 * Distribui o líquido recebido entre as parcelas, proporcionalmente ao valor de
 * cada uma.
 *
 * Para o Tiny quitar o título, `valorPago + valorTaxas` tem de fechar com o
 * valor do título. E a soma dos `valorPago` tem de bater com o que de fato
 * entrou na conta. A última parcela absorve o centavo do arredondamento, para
 * que as duas igualdades valham ao mesmo tempo.
 */
export function montaPayloadsBaixaML(item: ConciliacaoML): BaixaTituloParams[] {
  const { titulos, valor_titulos, valor_recebido, recebimento } = item;
  const data = recebimento.data_liberacao;

  let pagoAcumulado = 0;

  return titulos.map((t, i) => {
    const ultimo = i === titulos.length - 1;

    // A última recebe o resto, em vez de uma proporção arredondada.
    const valorPago = ultimo
      ? +(valor_recebido - pagoAcumulado).toFixed(2)
      : +((valor_recebido * t.valor) / valor_titulos).toFixed(2);

    pagoAcumulado = +(pagoAcumulado + valorPago).toFixed(2);

    return {
      id: t.id,
      data_recebimento: data,
      categoria: CATEGORIA_BAIXA_ML,
      historico: "",
      valorPago,
      contaDestino: CONTA_DESTINO_ML,
      valorAcrescimo: 0,
      valorDesconto: 0,
      valorJuros: 0,
      // O que sobra do título depois do que entrou é taxa do marketplace.
      valorTaxas: +(t.valor - valorPago).toFixed(2),
    };
  });
}

/** Confere o rateio antes de enviar: as duas igualdades têm de fechar. */
export function validaRateio(item: ConciliacaoML): string | null {
  const payloads = montaPayloadsBaixaML(item);

  const somaPago = +payloads.reduce((a, p) => a + p.valorPago, 0).toFixed(2);
  if (Math.abs(somaPago - item.valor_recebido) > 0.01) {
    return `Rateio inconsistente: soma dos valores pagos (${somaPago.toFixed(2)}) difere do recebido (${item.valor_recebido.toFixed(2)}).`;
  }

  const somaTitulos = +payloads
    .reduce((a, p) => a + p.valorPago + (p.valorTaxas ?? 0), 0)
    .toFixed(2);
  if (Math.abs(somaTitulos - item.valor_titulos) > 0.01) {
    return `Rateio inconsistente: pago + taxas (${somaTitulos.toFixed(2)}) difere da soma dos títulos (${item.valor_titulos.toFixed(2)}).`;
  }

  if (payloads.some((p) => p.valorPago < 0)) {
    return "Rateio inconsistente: alguma parcela ficou com valor pago negativo.";
  }

  return null;
}
