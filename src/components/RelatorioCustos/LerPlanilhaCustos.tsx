"use client";

import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import * as XLSX from "xlsx";
import { EntradaCusto, parseLinhasXls } from "./processaCustos";

type Props = {
  setEntradas: Dispatch<SetStateAction<EntradaCusto[] | null>>;
};

const ABA_ESPERADA = "Notas Fiscais Compra";

export default function LerPlanilhaCustos({ setEntradas }: Props) {
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("loading");

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });

      const sheet = workbook.SheetNames.find((name) => name === ABA_ESPERADA);

      if (!sheet) {
        setStatus("idle");
        alert(
          `A planilha deve conter uma aba chamada "${ABA_ESPERADA}". Verifique o arquivo e tente novamente.`
        );
        return;
      }

      const worksheet = workbook.Sheets[sheet];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as (string | number)[][];

      const entradas = parseLinhasXls(jsonData);
      setEntradas(entradas);

      setTimeout(() => {
        setNomeArquivo(file.name);
        setStatus("idle");
      }, 800);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleRemover = () => {
    setNomeArquivo("");
    setEntradas(null);
  };

  if (nomeArquivo && status === "idle") {
    return (
      <div className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3 shadow-lg my-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-medium text-sm truncate max-w-xs">
              {nomeArquivo}
            </p>
            <p className="text-emerald-50 text-xs">Planilha carregada com sucesso</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-all cursor-pointer">
            Trocar
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleUpload}
            />
          </label>
          <button
            onClick={handleRemover}
            className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full my-4">
      <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-sky-300/50 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-8 cursor-pointer hover:border-sky-400 hover:from-sky-100 hover:to-indigo-100 transition-all duration-300 group">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-400/0 to-indigo-400/0 group-hover:from-sky-400/5 group-hover:to-indigo-400/5 rounded-xl transition-all duration-300" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-4 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-7 h-7 text-white" />
          </div>

          {status === "loading" ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-sky-600 animate-spin" />
              <p className="text-sm text-sky-700 font-medium">
                Processando planilha...
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-700 font-semibold mb-1">
                Importar relatório de compras
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Clique ou arraste o arquivo aqui (.xls / .xlsx)
              </p>
              <p className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Aba esperada: <strong>{ABA_ESPERADA}</strong>
              </p>
            </>
          )}
        </div>

        <input
          type="file"
          className="hidden"
          accept=".xlsx,.xls"
          onChange={handleUpload}
        />
      </label>
    </div>
  );
}
