"use client";

import { Loader2, Upload, X, FileSpreadsheet } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import FiltraJsonShopee, { ObjetoPlanilhaFinal, PlanilhaXlsx } from './FiltraJsonShopee'
import * as XLSX from "xlsx";


type InputFileProps = {
    setDataPlanilha: Dispatch<SetStateAction<ObjetoPlanilhaFinal[] | null>>
};

export default function ReadXlsx({
    setDataPlanilha
}: InputFileProps) {
    const [sheetName, setSheetName] = useState("");
    const [uploadStatus, setUploadStatus] = useState<"loading" | "success">("success")

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadStatus("loading");

        const reader = new FileReader();

        reader.onload = (event) => {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            console.log(workbook.SheetNames);
            const sheet = workbook.SheetNames[2]; // Primeira aba
            const worksheet = workbook.Sheets[sheet];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const dataFormatada = FiltraJsonShopee(jsonData as PlanilhaXlsx);
            setDataPlanilha(dataFormatada)

            setTimeout(() => {
                setSheetName(sheet);
                setUploadStatus("success");
            }, 1500); // Delay de 1.5 segundos para simular carregamento
        };

        reader.readAsArrayBuffer(file);
    };

    const handleRemoveFile = () => {
        setSheetName("");
        setDataPlanilha(null);
    };

    // Versão resumida quando já tem arquivo carregado
    if (sheetName && uploadStatus === "success") {
        return (
            <div className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-3 shadow-lg my-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <FileSpreadsheet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-white font-medium text-sm">{sheetName}</p>
                        <p className="text-emerald-50 text-xs">Planilha carregada</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer">
                        Trocar
                        <input
                            type="file"
                            className="hidden"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                        />
                    </label>
                    <button
                        onClick={handleRemoveFile}
                        className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    // Versão completa para upload inicial
    return (
        <div className="w-full my-4">
            <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-sky-300/50 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-xl p-6 cursor-pointer hover:border-sky-400 hover:from-sky-100 hover:to-indigo-100 transition-all duration-300 group">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-400/0 to-indigo-400/0 group-hover:from-sky-400/5 group-hover:to-indigo-400/5 rounded-xl transition-all duration-300" />
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-3 rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300">
                        <Upload className="w-6 h-6 text-white" />
                    </div>
                    
                    {uploadStatus === "loading" ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 text-sky-600 animate-spin" />
                            <p className="text-sm text-sky-700 font-medium">
                                Processando planilha...
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-gray-700 font-medium mb-1">
                                Carregar planilha Excel
                            </p>
                            <p className="text-xs text-gray-500">
                                Clique ou arraste o arquivo aqui
                            </p>
                        </>
                    )}
                </div>
                
                <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                />
            </label>
        </div>
    );
}