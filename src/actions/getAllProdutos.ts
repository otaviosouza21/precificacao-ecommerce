"use server";

import { GET_ALL_PRODUTOS } from "@/api/api";
import apiError from "@/api/api-error";
import { ProdutosListApi, ProdutoApi } from "@/api/types/api-types";

// Busca todos os produtos, paginando até pegar tudo
export default async function getAllProdutos() {
  try {
    let pagina = 1;
    let todosProdutos: ProdutoApi[] = [];
    let totalPaginas = 1;

    do {
      const { url } = GET_ALL_PRODUTOS(pagina);
      const response = await fetch(url, {
        method: "GET",
        next: {
          tags: ["all-products"],
        },
      });

      if (!response.ok) throw new Error("Erro ao buscar produtos.");

      const data = (await response.json()) as ProdutosListApi;

      const produtosPagina = data.retorno.produtos || [];
      todosProdutos.push(...produtosPagina);

      // Pega o total de páginas da resposta
      totalPaginas = Number(data.retorno.numero_paginas || 1);
      pagina++;

    } while (pagina <= totalPaginas);

    const produtosEcommerce = todosProdutos.filter((produto)=> produto.produto.localizacao === 'Ecommerce')

    return { data: produtosEcommerce, ok: true, error: null };
  } catch (error) {
    return apiError(error);
  }
}
