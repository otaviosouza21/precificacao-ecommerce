export const TINY_V3_BASE = "https://api.tiny.com.br/public-api/v3";

export const ENDPOINTS = {
  PRODUTOS: "/produtos",
  PRODUTO: (id: string | number) => `/produtos/${id}`,
  PRODUTO_CUSTOS: (id: string | number) => `/produtos/${id}/custos`,
  NOTAS: "/notas",
  NOTA: (id: string | number) => `/notas/${id}`,
  PEDIDOS: "/pedidos",
  PEDIDO: (id: string | number) => `/pedidos/${id}`,
};

export function isoParaDataApi(iso: string): string {
  return iso;
}
