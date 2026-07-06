// Tipos da API Financeiro (Renda Shopee) da Bikeline.
// Ver: financeiro-api.md (GET /financeiro/renda e GET /financeiro/renda/:orderSn)

export type FluxoRenda = "MONEY_IN" | "MONEY_OUT" | "TODOS";

// Um lançamento (transação) da carteira Shopee retornado pela rota de listagem.
export interface LancamentoRenda {
  transacaoId: number;
  // order_sn (vazio em ajustes que não têm pedido).
  pedido: string;
  // Usuário do comprador (vazio em ajustes).
  cliente: string;
  // Tipo Shopee (ESCROW_VERIFIED_ADD, ADJUSTMENT_CENTER_ADD, etc.).
  tipo: string;
  fluxo: "MONEY_IN" | "MONEY_OUT";
  status: string;
  // Sempre positivo; o sinal está em `fluxo`.
  valor: number;
  saldoApos: number;
  dataRecebimento: string; // ISO
  dataRecebimentoUnix: number; // segundos
  descricao: string;
}

export interface RendaResponse {
  periodo: { de: string; ate: string };
  totalRegistros: number;
  // Soma líquida (entradas - saídas) já filtrada.
  somaValores: number;
  itens: LancamentoRenda[];
}

// Parâmetros de query da rota GET /financeiro/renda (todos opcionais).
export interface ListarRendaParams {
  de?: string; // YYYY-MM-DD, ISO ou Unix(s). Padrão: 14 dias atrás
  ate?: string; // mesmos formatos. Padrão: agora
  pedido?: string; // filtra por order_sn (parcial)
  cliente?: string; // filtra pelo comprador (parcial, case-insensitive)
  fluxo?: FluxoRenda; // padrão MONEY_IN
  tipo?: string; // tipo da transação Shopee
  valorMin?: number;
  valorMax?: number;
}

// Entrada de uma lista de taxas (comissão/serviço) da composição da Shopee.
export interface FeeInfoRenda {
  fee_amount?: number;
  rule_display_name?: string;
  rule_id?: number;
  category?: string;
}

// Um item (produto) dentro da composição financeira de um pedido.
export interface ItemComposicaoRenda {
  item_id?: number;
  item_sku?: string;
  item_name?: string;
  // Preço original do anúncio (= price_info.original_price). Base de cálculo.
  original_price?: number;
  // Preço de venda já com o desconto do vendedor (= price_info.current_price).
  selling_price?: number;
  seller_discount?: number;
  quantity_purchased?: number;
  [campo: string]: unknown;
}

/**
 * Composição financeira de um pedido (objeto cru da Shopee).
 * Os campos conhecidos estão tipados; os demais ficam acessíveis pela
 * assinatura de índice porque a Shopee devolve a quebra completa do escrow.
 */
export interface ComposicaoRenda {
  // Itens do pedido — cada um com original_price (anúncio) e selling_price.
  items?: ItemComposicaoRenda[];
  // Preço original do pedido (sem desconto) — soma dos itens. Base de cálculo.
  original_price?: number;
  order_original_price?: number;
  // Preço de venda do pedido (já com o desconto do vendedor).
  order_selling_price?: number;
  order_discounted_price?: number;
  // Desconto concedido pelo vendedor (rebate).
  seller_discount?: number;
  order_seller_discount?: number;
  commission_fee?: number;
  service_fee?: number;
  buyer_paid_shipping_fee?: number;
  actual_shipping_fee?: number;
  shopee_shipping_rebate?: number;
  // Comissão de afiliados do pedido.
  order_ams_commission_fee?: number;
  // Listas de taxas — a "Taxa de Serviço Afiliados do Vendedor" vem aqui.
  net_service_fee?: number;
  net_service_fee_info_list?: FeeInfoRenda[];
  net_commission_fee?: number;
  net_commission_fee_info_list?: FeeInfoRenda[];
  // Valor líquido que efetivamente entrou.
  escrow_amount?: number;
  [campo: string]: unknown;
}

export interface DetalheRenda {
  pedido: string;
  cliente: string;
  dataLiberacao: string; // ISO
  // Valor líquido recebido (escrow_amount).
  valorLiquido: number;
  composicao: ComposicaoRenda;
}
