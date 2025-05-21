"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  HandCoins,
  Merge,
  Rocket,
  Sheet,
  Upload,
} from "lucide-react";
import TitlePrimary from "../Ui/TitlePrimary";
import InputFile from "./InputFile";
import { useEffect, useState } from "react";
import ActionButton from "../Ui/Forms/ActionButton";
import { ProdutoApi } from "@/api/types/api-types";
import { ComparacaoResultado, compararCustos } from "@/functions/comparaCustos";
import ResultCard from "./ResultCard";
import { useTransition } from "react";
import { atualizarCustoTiny } from "@/actions/atualizarCustoTiny";

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
  const [isPending, startTransition] = useTransition();

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

  return (
    <section className="p-10 text-center">
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
          <h2 className="text-lg font-bold mb-2">Resultado da Comparação</h2>
          <div className="flex justify-between gap-5">
            <ResultCard
              result={planilhaCustos.length - 1}
              title="Total de Produtos"
              onClick={() => setRelatorioExibido("todos")}
            />
            <ResultCard
              result={resultadoComparacao.alterados.length}
              title="Produtos com custo alterado"
              onClick={() => setRelatorioExibido("alterados")}
            />
            <ResultCard
              result={resultadoComparacao.iguais.length}
              title="Produtos sem alteração"
              onClick={() => setRelatorioExibido("iguais")}
            />
          </div>
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
                      <button
                        disabled={icone === "➖"}
                        className="disabled:bg-gray-400  active:scale-98 cursor-pointer flex items-center text-sm gap-2 bg-blue-500 rounded-2xl p-2 text-blue-50"
                        onClick={() =>
                          startTransition(async () => {
                            const resposta = await atualizarCustoTiny({
                              codigo: pAlt.codigo,
                              custo: pAlt.custoPlanilha,
                              id: 744748205,
                              nome: 'Teste',
                              preco: 0
                            });

                            if (resposta.success) {
                              alert(
                                `Custo do produto ${pAlt.codigo} atualizado com sucesso!`
                              );
                              // Aqui você pode atualizar a interface se quiser
                            } else {
                              alert(
                                `Erro ao atualizar produto ${pAlt.codigo}: ${resposta.message}`
                              );
                            }
                          })
                        }
                      >
                        Igualar Custo
                        <Merge size={15} />
                      </button>
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
