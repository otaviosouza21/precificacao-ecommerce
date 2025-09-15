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
