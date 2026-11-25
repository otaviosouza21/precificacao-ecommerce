import type { ConciliacaoItem } from "../TitulosEcommerce";

// Regras de baixa dos títulos Shopee (V1 e V2), compartilhadas pela baixa
// individual e pela baixa em lote da TituloLista.

/** Payload enviado ao Tiny, igual para a baixa individual e em lote. */
export function montaPayloadBaixa(item: ConciliacaoItem) {
  return {
    id: item.id,
    data_recebimento: item.data_recebimento,
    categoria: "Venda Shopee",
    historico: "",
    valorPago: item.valor_recebido,
    contaDestino: "Caixa",
    valorAcrescimo: 0,
    valorDesconto: 0,
    valorJuros: 0,
    valorTaxas: item.valor_taxas,
  };
}

/** Só título com valor conferido pode ir ao Tiny, na baixa individual ou em lote. */
export function podeBaixarTitulo(item: ConciliacaoItem): boolean {
  return item.valor_recebido === item.valor_calculado;
}

/**
 * A baixa quita o título quando pago + taxas = valor do título. Na V2 a conta
 * fecha com o preço base (referência); se o título do Tiny tem outro valor, o
 * cálculo pode conferir com a Shopee e mesmo assim não fechar o título.
 * Tolera até 0,02, que é o arredondamento para cima aceito da Shopee.
 */
export function baixaFechaTitulo(item: ConciliacaoItem): boolean {
  const p = montaPayloadBaixa(item);
  return Math.abs(p.valorPago + p.valorTaxas - item.valor_titulo) <= 0.02 + 1e-9;
}

/**
 * Título que bateu de primeira: valor confere e sem nenhum alerta
 * (arredondamento, afiliados, venda diferente da referência ou baixa que não
 * fecha o título). É o critério do "Selecionar OK".
 */
export function tituloSemDivergencia(item: ConciliacaoItem): boolean {
  return (
    podeBaixarTitulo(item) &&
    !item.houveArredondamento &&
    Number(item.taxa_afiliados) === 0 &&
    !item.divergeRef &&
    baixaFechaTitulo(item)
  );
}
