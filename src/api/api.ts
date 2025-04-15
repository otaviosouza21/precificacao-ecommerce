export const API_URL = 'https://api.tiny.com.br/api2'

//Produtos
export function GET_ALL_PRODUTOS(pagina: number = 1) {
    return {
        url: `${API_URL}/produtos.pesquisa.php?token=${process.env.API_KEY_TINY}&formato=json&pagina=${pagina}`,
    };
  }