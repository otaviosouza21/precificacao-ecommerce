"use server";

import { GET_ALL_TITULOS_RECEBER } from "@/api/api";
import apiError from "@/api/api-error";
import {
  TitulosAReceberListApi,
  TitulosReceberApiTiny,
} from "@/api/types/api-types";

export default async function buscaTitulosTiny() {
  try {
    let pagina = 1;
    const contasAReceber: TitulosReceberApiTiny[] = [];
    let totalPaginas = 1;
    const LIMITE_PAGINAS = 1000; // Proteção contra loop infinito

    do {
      // Passa o número da página para a API
      const { url } = GET_ALL_TITULOS_RECEBER(pagina); // ou { pagina }
      
      const response = await fetch(url, {
        method: "GET",
        next: {
          tags: ["all-titulos"],
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar títulos na página ${pagina}: ${response.status}`);
      }

      const data = (await response.json()) as TitulosAReceberListApi;

      // Validação de estrutura da resposta
      if (!data?.retorno) {
        throw new Error("Estrutura de resposta inválida");
      }

      const titulos = data.retorno.contas || [];
      
      // Se não há títulos e é a primeira página, pode não haver dados
      if (titulos.length === 0 && pagina === 1) {
        console.log("Nenhum título encontrado");
        break;
      }

      // Se não há títulos em páginas subsequentes, chegamos ao fim
      if (titulos.length === 0 && pagina > 1) {
        break;
      }

      contasAReceber.push(...titulos);

      // Atualiza total de páginas apenas na primeira requisição
      if (pagina === 1) {
        totalPaginas = Number(data.retorno.numero_paginas || 1);
        console.log(`Total de páginas: ${totalPaginas}`);
      }

      console.log(`Página ${pagina}/${totalPaginas} processada. Títulos: ${titulos.length}`);
      pagina++;

      // Proteção contra loop infinito
      if (pagina > LIMITE_PAGINAS) {
        console.warn("Limite de páginas atingido, interrompendo busca");
        break;
      }

    } while (pagina <= totalPaginas);

    console.log(`Busca finalizada. Total de títulos: ${contasAReceber.length}`);
    return { data: contasAReceber, ok: true, error: null };

  } catch (error) {
    console.error("Erro na busca de títulos:", error);
    return apiError(error);
  }
}