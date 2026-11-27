"use client";

// Cálculo da conciliação Shopee feito pela API da Bikeline (fonte única: o
// mesmo cálculo da rotina automática de conciliação). A tela v2 envia o escrow
// que já buscou e recebe o líquido esperado, as taxas e a classificação.

import {
  FINANCEIRO_API_URL,
  FinanceiroApiError,
  type ComposicaoRenda,
} from "@/lib/financeiro";
import type { ResultadoCalculoV2 } from "@/components/TitulosEcommerce/v2/calculoV2";

const TOKEN_KEY = "bkline.access_token";

export interface ItemCalculoConciliacao {
  pedido: string;
  valorRecebido: number;
  valorTitulo: number;
  composicao?: ComposicaoRenda;
}

export type CategoriaConciliacao =
  | "OK"
  | "AFILIADOS"
  | "SEM_DETALHE"
  | "VALOR_DIFERENTE"
  | "DIVERGENCIA_REFERENCIA"
  | "TITULO_DIFERENTE";

export interface ResultadoItemConciliacao {
  pedido: string;
  resultado: ResultadoCalculoV2;
  classificacao: {
    categoria: CategoriaConciliacao;
    alertas: CategoriaConciliacao[];
    // recebido + taxas − saldo do título (> 0 = subsídio da Shopee; < 0 = falta).
    diferencaTitulo: number;
    subsidioShopee: number;
    divergeReferencia: boolean;
  };
}

export interface RespostaCalculoConciliacao {
  tabelaTaxas: { padrao: boolean; atualizadoEm: string | null };
  precosReferencia: number;
  itens: ResultadoItemConciliacao[];
}

// Só o que o cálculo usa do escrow — mantém o corpo da requisição pequeno
// mesmo com centenas de pedidos.
function enxugarComposicao(c: ComposicaoRenda | undefined) {
  if (!c) return undefined;
  const taxas = (lista: ComposicaoRenda["net_service_fee_info_list"]) =>
    Array.isArray(lista)
      ? lista.map((e) => ({
          rule_display_name: e?.rule_display_name,
          fee_amount: e?.fee_amount,
        }))
      : undefined;
  return {
    items: Array.isArray(c.items)
      ? c.items.map((i) => ({
          item_sku: i.item_sku,
          model_sku: i.model_sku,
          original_price: i.original_price,
          seller_discount: i.seller_discount,
          quantity_purchased: i.quantity_purchased,
        }))
      : undefined,
    order_discounted_price: c.order_discounted_price,
    order_selling_price: c.order_selling_price,
    order_ams_commission_fee: c.order_ams_commission_fee,
    net_service_fee_info_list: taxas(c.net_service_fee_info_list),
    net_commission_fee_info_list: taxas(c.net_commission_fee_info_list),
  };
}

export async function calcularConciliacaoShopee(
  token: string | null | undefined,
  itens: ItemCalculoConciliacao[],
): Promise<RespostaCalculoConciliacao> {
  const jwt =
    token ??
    (typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null);
  if (!jwt) {
    throw new FinanceiroApiError(401, "Não autenticado — refaça o login.");
  }

  let res: Response;
  try {
    res = await fetch(`${FINANCEIRO_API_URL}/conciliacao/shopee/calcular`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        itens: itens.map((i) => ({
          pedido: i.pedido,
          valorRecebido: i.valorRecebido,
          valorTitulo: i.valorTitulo,
          composicao: enxugarComposicao(i.composicao),
        })),
      }),
    });
  } catch {
    throw new FinanceiroApiError(
      0,
      "Não foi possível conectar ao servidor. Verifique se a API está no ar.",
    );
  }

  const body = await res.json().catch(() => null);
  if (res.status === 401) {
    throw new FinanceiroApiError(401, "Não autenticado — refaça o login.");
  }
  if (!res.ok) {
    const msg = (body as { message?: string | string[] } | null)?.message;
    throw new FinanceiroApiError(
      res.status,
      (Array.isArray(msg) ? msg.join(" ") : msg) ||
        `Erro ${res.status} ao calcular a conciliação`,
    );
  }
  return body as RespostaCalculoConciliacao;
}
