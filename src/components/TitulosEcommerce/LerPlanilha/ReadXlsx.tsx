"use client";

import { CheckCircle, Loader2, Sheet } from "lucide-react";
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

    return (
        <div className="w-full rounded-2xl flex flex-col p-4 bg-sky-700 my-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-400 rounded-lg h-30 cursor-pointer hover:bg-sky-800 transition">
                <Sheet />
                <p className="text-sm text-gray-50 ">
                    Arraste e solte sua planilha Excel aqui
                </p>
                <p className="text-xs text-gray-400 my-1">ou</p>
                <span className="bg-indigo-500 text-white px-4 py-1 rounded text-sm mt-1 hover:bg-indigo-600">
                    Selecionar Arquivo
                </span>
                <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                />
            </label>

            {uploadStatus === "loading" && (
                <div className="flex items-center self-center gap-2 mt-2 text-yellow-200 text-sm animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando planilha...
                </div>
            )}

            {uploadStatus === "success" && (
                <div className="flex items-center self-center gap-2 mt-2 text-green-300 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Planilha `{sheetName}` carregada com sucesso!
                </div>
            )}
        </div>
    );
}
