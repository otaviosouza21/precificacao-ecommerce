export const API_URL = "https://api.tiny.com.br/api2";

//Produtos
export function GET_ALL_PRODUTOS(pagina: number = 1) {
  return {
    url: `${API_URL}/produtos.pesquisa.php?token=${process.env.API_KEY_TINY}&formato=json&pagina=${pagina}`,
  };
}

export function GET_PRODUTO_TINY_BY_ID(id: number) {
  return {
    url: `https://api.tiny.com.br/api2/produto.obter.php?token=${process.env.API_KEY_TINY}&id=${id}&formato=json`,
  };
}

export function GET_ALL_TITULOS_RECEBER(pagina: number) {
  return {
    url: `${API_URL}/contas.receber.pesquisa.php?token=${process.env.API_KEY_TINY}&formato=json&pagina=${pagina}&situacao=aberto`,
  };
}

// Pesquisa produto por SKU/código (campo "pesquisa" aceita nome ou código)
export function GET_PRODUTO_BY_SKU(sku: string) {
  return {
    url: `${API_URL}/produtos.pesquisa.php?token=${process.env.API_KEY_TINY}&formato=json&pesquisa=${encodeURIComponent(sku)}`,
  };
}

// Pesquisa pedidos com filtros de data, situação e produto
export function GET_PEDIDOS_PESQUISA(params: {
  dataInicial: string; // DD/MM/YYYY
  dataFinal: string; // DD/MM/YYYY
  situacao?: string;
  idProduto?: number | string;
  pagina?: number;
}) {
  const qs = new URLSearchParams({
    token: process.env.API_KEY_TINY ?? "",
    formato: "json",
    dataInicial: params.dataInicial,
    dataFinal: params.dataFinal,
    pagina: String(params.pagina ?? 1),
  });
  if (params.situacao) qs.append("situacao", params.situacao);
  if (params.idProduto) qs.append("idProduto", String(params.idProduto));
  return {
    url: `${API_URL}/pedidos.pesquisa.php?${qs.toString()}`,
  };
}

// Obtém detalhes completos de um pedido (inclui itens)
export function GET_PEDIDO_BY_ID(id: number | string) {
  return {
    url: `${API_URL}/pedido.obter.php?token=${process.env.API_KEY_TINY}&id=${id}&formato=json`,
  };
}
