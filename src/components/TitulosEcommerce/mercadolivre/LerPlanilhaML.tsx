"use client";

import { Loader2, Upload, X, FileSpreadsheet } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import * as XLSX from "xlsx";
import parseReserveML, {
  PlanilhaML,
  PlanilhaMLError,
  RecebimentoML,
} from "./parseReserveML";

type Props = {
  setRecebimentos: (r: RecebimentoML[] | null) => void;
  /** Faixa de datas de venda — usada para delimitar a busca de pedidos no Tiny. */
  setPeriodo: Dispatch<SetStateAction<{ de: string; ate: string } | null>>;
  setAvisos: Dispatch<SetStateAction<string[]>>;
};

export default function LerPlanilhaML({
  setRecebimentos,
  setPeriodo,
  setAvisos,
}: Props) {
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [resumo, setResumo] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCarregando(true);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // O relatório do Mercado Pago vem com uma aba só, cujo nome varia
        // ("Sheet0", "sheet0"...). Usa a primeira, sem exigir nome.
        const nomeAba = workbook.SheetNames[0];
        if (!nomeAba) {
          throw new PlanilhaMLError("O arquivo não contém nenhuma aba.");
        }

        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[nomeAba], {
          header: 1,
          raw: true,
        });

        const { recebimentos, periodoOrigem, avisos, descartadas } =
          parseReserveML(jsonData as PlanilhaML);

        if (recebimentos.length === 0) {
          throw new PlanilhaMLError(
            "Nenhuma operação com número de pedido do Mercado Livre foi encontrada no arquivo.",
          );
        }

        setRecebimentos(recebimentos);
        setPeriodo(periodoOrigem);
        setAvisos(avisos);
        setNomeArquivo(file.name);
        setResumo(
          `${recebimentos.length} operações` +
            (descartadas > 0 ? ` · ${descartadas} linhas sem pedido ignoradas` : ""),
        );
      } catch (error) {
        setRecebimentos(null);
        setPeriodo(null);
        setAvisos([]);
        if (error instanceof PlanilhaMLError) {
          alert(error.message);
        } else {
          alert(
            "Não foi possível processar a planilha. Verifique o arquivo e tente novamente.",
          );
          console.error("Erro ao processar relatório do Mercado Pago:", error);
        }
      } finally {
        setCarregando(false);
        // Permite recarregar o mesmo arquivo depois de corrigi-lo.
        e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleRemoveFile = () => {
    setNomeArquivo("");
    setResumo("");
    setRecebimentos(null);
    setPeriodo(null);
    setAvisos([]);
  };

  if (nomeArquivo && !carregando) {
    return (
      <div className="w-full flex items-center justify-between bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl p-3 shadow-lg my-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{nomeArquivo}</p>
            <p className="text-amber-50 text-xs">{resumo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer">
            Trocar
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
          </label>
          <button
            onClick={handleRemoveFile}
            className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200"
            aria-label="Remover planilha"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full my-4">
      <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-amber-300/60 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 cursor-pointer hover:border-amber-400 hover:from-amber-100 hover:to-yellow-100 transition-all duration-300 group">
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-gradient-to-br from-amber-500 to-yellow-500 p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-6 h-6 text-white" />
          </div>

          {carregando ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
              <p className="text-sm text-amber-700 font-medium">
                Processando relatório...
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 font-medium mb-1">
                Carregar relatório de Liberações do Mercado Pago
              </p>
              <p className="text-xs text-gray-500 text-center">
                Relatórios e faturamento → Liberações → <strong>Ajustes</strong>{" "}
                (marque todas as colunas) → Gerar
              </p>
            </>
          )}
        </div>

        <input
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
        />
      </label>
    </div>
  );
}
