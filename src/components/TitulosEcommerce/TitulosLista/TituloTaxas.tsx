import { brlConvert } from "@/functions/brlConvert";
import { ConciliacaoItem } from "../TitulosEcommerce";
import { useState } from "react";
import { Info } from "lucide-react";

export default function TituloTaxas({ item }: { item: ConciliacaoItem }) {
  const [exibeTaxas, setExibeTaxas] = useState(false);
  const regra_comissao =
    (item.regra.perc_comissao_shopee * 100).toFixed(0) + "%";

  const d = item.detalheV2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <Info
        onMouseEnter={() => setExibeTaxas(true)}
        onMouseLeave={() => setExibeTaxas(false)}
        className="text-blue-500 hover:text-blue-600 size-4 cursor-pointer transition-colors"
      />
      {exibeTaxas && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-50 w-72 animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
              Detalhamento de Taxas
            </h4>

            {d ? (
              // v2 — detalhamento por item (base Shopee, taxa fixa × unidade)
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Preço base:</span>
                  <span className="font-semibold text-gray-900">
                    {brlConvert(d.base)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    Comissão{d.comissaoPerc != null ? ` (${(d.comissaoPerc * 100).toFixed(0)}%)` : ""}:
                  </span>
                  <span className="font-semibold text-red-600">
                    - {brlConvert(d.comissaoValor)}
                  </span>
                </div>

                {/* Taxa fixa — destaque da multiplicação por unidade */}
                <div className="rounded-md bg-amber-50 ring-1 ring-amber-200 px-2.5 py-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-amber-800">Taxa fixa</span>
                    <span className="font-semibold text-red-600">
                      - {brlConvert(d.taxaFixaTotal)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-amber-700">
                    {d.taxaFixaUnitaria != null ? (
                      <>
                        {brlConvert(d.taxaFixaUnitaria)}{" "}
                        <span className="font-bold">
                          × {d.quantidade}{" "}
                          {d.quantidade > 1 ? "unidades" : "unidade"}
                        </span>
                      </>
                    ) : (
                      <>cobrada por unidade · {d.quantidade} un ({d.itens} itens)</>
                    )}
                  </div>
                </div>

                {d.afiliadosComissao + d.afiliadosServico > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Comissão afiliados:</span>
                    <span className="font-semibold text-red-600">
                      - {brlConvert(d.afiliadosComissao + d.afiliadosServico)}
                    </span>
                  </div>
                )}

                {item.houveArredondamento && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Arredondamento:</span>
                    <span className="font-semibold text-red-600">
                      - {brlConvert(0.01)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm border-t border-gray-100 pt-2">
                  <span className="text-gray-600">Total de taxas:</span>
                  <span className="font-semibold text-red-600">
                    - {brlConvert(d.taxaTotal)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Valor líquido:</span>
                  <span className="font-semibold text-gray-900">
                    {brlConvert(d.liquido)}
                  </span>
                </div>
              </>
            ) : (
              // v1 — detalhamento a partir do valor do título
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Valor Total:</span>
                  <span className="font-semibold text-gray-900">
                    {brlConvert(item.valor_titulo)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Subsídio Pix:</span>
                  <span className="font-semibold text-green-600">
                    + {brlConvert(item.subisidio_pix)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    Comissão: {regra_comissao}
                  </span>
                  <span className="font-semibold text-red-600">
                    -{" "}
                    {brlConvert(
                      item.regra.perc_comissao_shopee *
                        (item.valor_titulo + item.subisidio_pix),
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Taxa</span>
                  <span className="font-semibold text-red-600">
                    - {brlConvert(item.regra.taxa_fixa_shopee)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Taxa Afiliados</span>
                  <span className="font-semibold text-red-600">
                    {brlConvert(item.taxa_afiliados)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Valor Liquido:</span>
                  <span className="font-semibold ">
                    {brlConvert(item.valor_calculado)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Seta indicadora */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2">
            <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-gray-200"></div>
            <div className="absolute top-0 left-0.5 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white"></div>
          </div>
        </div>
      )}
    </div>
  );
}
