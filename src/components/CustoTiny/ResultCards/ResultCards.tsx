import { ComparacaoResultado } from "@/functions/comparaCustos";
import ResultCard from "./ResultCard";

type ResultCardsProps = {
  planilhaCustos: any[];
  relatorioExibido: "alterados" | "iguais" | "todos";
  onChangeView: (view: "alterados" | "iguais" | "todos") => void;
  resultadoComparacao: ComparacaoResultado;
};

export default function ResultCards({
  planilhaCustos,
  relatorioExibido,
  onChangeView,
  resultadoComparacao,
}: ResultCardsProps) {
  return (
    <div className="flex justify-between gap-5 mt-4">
      <ResultCard
        result={planilhaCustos.length - 1}
        title="Total de Produtos"
        onClick={() => onChangeView("todos")}
        className={`${
          relatorioExibido === "todos"
            ? "border-sky-300/50 bg-sky-200 -translate-y-1 "
            : ""
        }`}
      />
      <ResultCard
        result={resultadoComparacao.alterados.length}
        title="Produtos com custo alterado"
        onClick={() => onChangeView("alterados")}
        className={`${
          relatorioExibido === "alterados"
            ? "border-sky-300/50 bg-sky-200 -translate-y-1 "
            : ""
        }`}
      />
      <ResultCard
        result={resultadoComparacao.iguais.length}
        title="Produtos sem alteração"
        onClick={() => onChangeView("iguais")}
        className={`${
          relatorioExibido === "iguais"
            ? "border-sky-300/50 bg-sky-200 -translate-y-1 "
            : ""
        }`}
      />
    </div>
  );
}
