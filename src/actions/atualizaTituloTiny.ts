"use server";

import { formatDate } from "@/components/TitulosEcommerce/functions/formataDados";
import { revalidateTag } from "next/cache";

export interface BaixaTituloParams {
  id: string;
  contaDestino?: string;
  data_recebimento: string;
  categoria: string;
  historico: string;
  valorTaxas?: number;
  valorJuros?: number;
  valorDesconto?: number;
  valorAcrescimo?: number;
  valorPago: number;
}

export async function atualizaTituloTiny({
  id,
  contaDestino = "",
  data_recebimento,
  categoria,
  historico,
  valorTaxas = 0,
  valorJuros = 0,
  valorDesconto = 0,
  valorAcrescimo = 0,
  valorPago,
}: BaixaTituloParams) {


  try {
    const token = process.env.API_KEY_TINY;
   
    // JSON no formato exigido pelo Tiny
    const contaJson = {
      conta: {
        id,
        contaDestino,
        data: formatDate(data_recebimento),
        categoria,
        historico,
        valorTaxas,
        valorJuros,
        valorDesconto,
        valorAcrescimo,
        valorPago,
      },
    };

    // Criando o form-data com os campos exigidos
    const formData = new FormData();
    formData.append("token", token as string);
    formData.append("formato", "json");
    formData.append("conta", JSON.stringify(contaJson));

    const response = await fetch(
      "https://api.tiny.com.br/api2/conta.receber.alterar.php",
      {
        method: "POST",
        body: formData,
        next: {
          tags: ["contas-receber"],
        },
      }
    );

    const data = await response.json();
    

    if (response.ok && data.retorno.status === "OK") {
      revalidateTag("all-titulos");
      return { success: true, message: "Título baixado com sucesso" };
    } else {
      const erros = data.retorno?.registros?.[0]?.registro?.erros?.map(
        (e: Error) => e.message
      ) || [data.retorno?.erro] || ["Erro na baixa do título"];
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
