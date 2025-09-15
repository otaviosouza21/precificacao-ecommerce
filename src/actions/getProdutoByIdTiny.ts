import { GET_PRODUTO_TINY_BY_ID } from "@/api/api";
import apiError from "@/api/api-error";
import { ProdutoTiny } from "@/api/types/api-types";

export async function getProdutoByIdTiny(id: number) {
  try {
    const { url } = GET_PRODUTO_TINY_BY_ID(id);

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) throw new Error("Erro ao buscar produto.");

    const data = (await response.json()).retorno.produto as ProdutoTiny;

    if (!data) throw new Error("Erro ao buscar produto.");

    return { data: data, ok: true, error: null };
  } catch (error) {
    return apiError(error);
  }
}
