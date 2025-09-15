"use server";

import { revalidateTag } from "next/cache";
import { getProdutoByIdTiny } from "./getProdutoByIdTiny";

export async function atualizarCustoTiny({
  id,
  custo,
}: {
  id: number;
  custo: number;
}) {
  try {
      const token = process.env.API_KEY_TINY;

    const { data: produtoTiny } = await getProdutoByIdTiny(id);
    console.log(produtoTiny);
    // JSON no formato exigido pelo Tiny
    const produtoJson = {
      produtos: [
        {
          produto: {
            sequencia: 1,
            ...produtoTiny,
            tipo_embalagem: produtoTiny?.tipoEmbalagem,
            comprimento_embalagem: produtoTiny?.comprimentoEmbalagem,
            largura_embalagem: produtoTiny?.larguraEmbalagem,
            diametro_embalagem: produtoTiny?.diametroEmbalagem,
            preco_custo: custo,
          },
        },
      ],
    };

    // Criando o form-data com os campos exigidos
    const formData = new FormData();
    formData.append("token", token as string);
    formData.append("formato", "json");
    formData.append("produto", JSON.stringify(produtoJson));

    const response = await fetch(
      "https://api.tiny.com.br/api2/produto.alterar.php",
      {
        method: "POST",
        body: formData,
        next: {
          tags: ["all-products"],
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.retorno.status === "OK") {
      revalidateTag("all-products");
      return { success: true, message: "Custo atualizado com sucesso" };
    } else {
      const erros = data.retorno?.registros?.[0]?.registro?.erros?.map(
        (e: Error) => e.message
      ) || [data.retorno?.erro] || ["Erro na atualização"];
      return {
        success: false,
        message: erros.join("; "),
      };
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
    return { success: false, message: "Erro na requisição: " + errMsg };
  }
}
