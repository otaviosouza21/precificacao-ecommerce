import { brlConvert } from "@/functions/brlConvert";
import { ConciliacaoItem } from "../TitulosEcommerce";
import { useState } from "react";
import { Info } from "lucide-react";

export default function TituloTaxas({ item }: { item: ConciliacaoItem }) {
    const [exibeTaxas, setExibeTaxas] = useState(false);
    const valorLiquido = item.valor_titulo - (item.valor_titulo * 0.20)- 4;


    return (
        <div className="relative inline-flex items-center justify-center">
            <Info
                onMouseEnter={() => setExibeTaxas(true)}
                onMouseLeave={() => setExibeTaxas(false)}
                className="text-blue-500 hover:text-blue-600 size-4 cursor-pointer transition-colors"
            />
            {exibeTaxas &&
                <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50 w-64 animate-in fade-in slide-in-from-left-2 duration-200">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                            Detalhamento de Taxas
                        </h4>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Valor Total:</span>
                            <span className="font-semibold text-gray-900">{brlConvert(item.valor_titulo)}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Comissão (20%):</span>
                            <span className="font-semibold text-red-600">- {brlConvert((item.valor_titulo * 0.20)) || 0}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Taxa Fixa (R$ 4):</span>
                            <span className="font-semibold text-red-600">- {brlConvert(4)}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Valor Liquido:</span>
                            <span className="font-semibold ">{brlConvert(valorLiquido)}</span>
                        </div>

                    </div>

                    {/* Seta indicadora */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-gray-200"></div>
                        <div className="absolute top-0 left-0.5 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white"></div>
                    </div>
                </div>
            }
        </div>


    )
}