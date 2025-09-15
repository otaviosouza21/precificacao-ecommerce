import { ProdutoApi } from "@/api/types/api-types";
import { brlConvert } from "@/functions/brlConvert";
import { marketplaceParamsTypes } from "../Precificacao";
import { useState } from "react";
import TabelProduto from "./TabelaProduto";

export default function TabelaPrecificacao({
  produtos,
  marketplaceParams,
}: {
  produtos: ProdutoApi[];
  marketplaceParams: marketplaceParamsTypes;
}) {
  // Função para formatar valor em moeda BRL (ao digitar)
  function formatarBRL(valor: string) {
    const apenasNumeros = valor.replace(/\D/g, ""); // remove tudo que não é número
    const valorNumerico = parseFloat(apenasNumeros) / 100;
    const texto = valorNumerico.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return { numero: valorNumerico, texto };
  }

  if (produtos.length < 1)
    return (
      <div className="flex justify-center mt-8">
        Não há produtos a serem exibidos
      </div>
    );

  return (
    <div className="p-4 bg-[#111827] rounded-2xl text-white font-sans mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-left border-b border-gray-700">
            <th className="p-3"></th>
            <th className="p-3">PRODUTO</th>
            <th className="p-3">CUSTO PRODUTO</th>
            <th className="p-3">CUSTO OPERACIONAL</th>
            <th className="p-3">CUSTO TOTAL</th>
            <th className="p-3">PREÇO ATUAL</th>
            <th className="p-3">LUCRO</th>
            <th className="p-3">MARGEM</th>
            <th className="p-3">SIMULAÇÃO LUCRO</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto, index) => {
            return (
              <TabelProduto
                key={produto.produto.id}
                formatarBRL={formatarBRL}
                marketplaceParams={marketplaceParams}
                produto={produto}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
