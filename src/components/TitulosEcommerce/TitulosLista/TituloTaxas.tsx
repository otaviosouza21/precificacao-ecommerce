import { brlConvert } from "@/functions/brlConvert";
import { ConciliacaoItem } from "../TitulosEcommerce";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

type Coords = { top: number; left: number; placement: "right" | "left" };

const TOOLTIP_WIDTH = 288; // w-72
const GAP = 12;

export default function TituloTaxas({ item }: { item: ConciliacaoItem }) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const regra_comissao =
    (item.regra.perc_comissao_shopee * 100).toFixed(0) + "%";

  const d = item.detalheV2;

  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // Sem espaço à direita? Abre para a esquerda.
    const spaceRight = window.innerWidth - rect.right;
    const placement: Coords["placement"] =
      spaceRight < TOOLTIP_WIDTH + GAP ? "left" : "right";

    const left =
      placement === "right"
        ? rect.right + GAP
        : rect.left - GAP - TOOLTIP_WIDTH;

    setCoords({
      top: rect.top + rect.height / 2,
      left,
      placement,
    });
  }, []);

  const abrir = useCallback(() => computePosition(), [computePosition]);
  const fechar = useCallback(() => setCoords(null), []);

  // Reposiciona enquanto o tooltip estiver aberto (scroll da tabela / resize).
  useLayoutEffect(() => {
    if (!coords) return;
    const onScrollOrResize = () => computePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [coords, computePosition]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={abrir}
        onMouseLeave={fechar}
        onFocus={abrir}
        onBlur={fechar}
        aria-label="Detalhamento de taxas"
        className="inline-flex items-center justify-center"
      >
        <Info className="text-blue-500 hover:text-blue-600 size-4 cursor-pointer transition-colors" />
      </button>

      {coords &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: TOOLTIP_WIDTH,
              transform: "translateY(-50%)",
            }}
            className="z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="relative bg-white border border-gray-200 rounded-xl shadow-2xl p-4 space-y-2">
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
                      Comissão
                      {d.comissaoPerc != null
                        ? ` (${(d.comissaoPerc * 100).toFixed(0)}%)`
                        : ""}
                      :
                    </span>
                    <span className="font-semibold text-red-600">
                      - {brlConvert(d.comissaoValor)}
                    </span>
                  </div>

                  {/* Taxa fixa — destaque da multiplicação por unidade */}
                  <div className="rounded-md bg-amber-50 ring-1 ring-amber-200 px-2.5 py-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-amber-800">
                        Taxa fixa
                      </span>
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
                        <>
                          cobrada por unidade · {d.quantidade} un ({d.itens}{" "}
                          itens)
                        </>
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

              {/* Seta indicadora */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 ${
                  coords.placement === "right"
                    ? "left-0 -translate-x-2"
                    : "right-0 translate-x-2 rotate-180"
                }`}
              >
                <div className="w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-gray-200" />
                <div className="absolute top-0 left-0.5 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-white" />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
