"use client";

import { ArrowDown, ArrowUp, HandCoins } from "lucide-react";
import TitlePrimary from "../Ui/TitlePrimary";
import InputFile from "./InputFile";
import { useState } from "react";
import ActionButton from "../Ui/Forms/ActionButton";
import { ProdutoApi } from "@/api/types/api-types";
import { ComparacaoResultado, compararCustos } from "@/functions/comparaCustos";
import { useRouter } from "next/navigation";
import ResultCards from "./ResultCards/ResultCards";
import AtualizaCustoButton from "./ResultCards/AtualizaCustoButton";

export default function CustoTiny({
  produtosTiny,
}: {
  produtosTiny: ProdutoApi[];
}) {
  const [planilhaCustos, setPlanilhaCustos] = useState<any[]>([]);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "loading" | "success"
  >("idle");
  const [resultadoComparacao, setResultadoComparacao] =
    useState<ComparacaoResultado | null>(null);
  const [relatorioExibido, setRelatorioExibido] = useState<
    "alterados" | "iguais" | "todos"
  >("alterados");

  const router = useRouter();

  function diferencaPercentual(erp: number, tiny: number) {
    const diferenca = ((tiny - erp) / erp) * 100;
    const percentual = Math.abs(diferenca).toFixed(2);
    const status =
      diferenca > 0 ? "Aumento" : diferenca < 0 ? "Queda" : "Igual";
    const icone =
      diferenca > 0 ? (
        <ArrowDown size={15} />
      ) : diferenca < 0 ? (
        <ArrowUp size={15} />
      ) : (
        "➖"
      );
    const cor =
      diferenca > 0
        ? "text-green-600"
        : diferenca < 0
        ? "text-red-600"
        : "text-gray-500";

    return {
      valorFormatado: percentual + "%",
      status,
      icone,
      cor,
    };
  }

  function onChangeView(view: "alterados" | "iguais" | "todos") {
    setRelatorioExibido(view);
  }

  return (
    <section className="p-8 flex w-full flex-col  text-center">
      <TitlePrimary title="Comparador de Custos Tiny" />
      <p className="text-gray-400">
        Compare os custos da sua planilha com os dados da API do Tiny
      </p>
      <InputFile
        setPlanilhaCustos={setPlanilhaCustos}
        uploadStatus={uploadStatus}
        setUploadStatus={setUploadStatus}
      />
      {uploadStatus === "success" && (
        <ActionButton
          onClick={() => {
            const resultado = compararCustos(produtosTiny, planilhaCustos);
            setResultadoComparacao(resultado);
          }}
          icon={HandCoins}
          text="Comparar Custos"
        />
      )}
      {resultadoComparacao && (
        <div className="my-4 bg-sky-50 text-blue-900 p-4 rounded-2xl shadow-2xl">
          <TitlePrimary size="text-lg" title="Resultado da Comparação" />
          <ResultCards
            onChangeView={onChangeView}
            planilhaCustos={planilhaCustos}
            relatorioExibido={relatorioExibido}
            resultadoComparacao={resultadoComparacao}
          />
          <table className="w-full mt-6 text-sm">
            <thead>
              <tr className="*:text-start *:py-2 *:px-3 ">
                <th>Codigo</th>
                <th>Produto</th>
                <th>Custo Tiny</th>
                <th>Custo ERP</th>
                <th>Diferença (%)</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody className="">
              {resultadoComparacao[relatorioExibido].map((pAlt) => {
                const { valorFormatado, icone, cor } = diferencaPercentual(
                  pAlt.custoPlanilha,
                  pAlt.custoTiny
                );
                return (
                  <tr className="shadow rounded-2xl  hover:bg-blue-100/60 *:py-2 *:px-3 *:text-start  ">
                    <td>{pAlt.codigo}</td>
                    <td>{pAlt.descricao}</td>
                    <td className="">{pAlt.custoTiny}</td>
                    <td className="">{pAlt.custoPlanilha}</td>
                    <td className={`flex items-center gap-2 ${cor}`}>
                      {valorFormatado} {icone}
                    </td>
                    <td>
                      <AtualizaCustoButton pAlt={pAlt} icone={icone} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
