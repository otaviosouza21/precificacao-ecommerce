'use client'

import { useEffect, useState } from "react"
import ReadXlsx from "./LerPlanilha/ReadXlsx"
import { ObjetoPlanilhaFinal } from "./LerPlanilha/FiltraJsonShopee"
import buscaTitulosTiny from "@/actions/buscaTitulosTiny";
import { TitulosReceberApiTiny } from "@/api/types/api-types";
import TituloLista from "./TitulosLista/TituloLista";
import { calculaTaxas } from "./functions/formataDados";



export type ConciliacaoItem = {
    id_ecommerce: string;
    descricao_anuncio: string;
    valor_recebido: number;
    valor_titulo: number;
    valor_calculado: number;
    valor_taxas: number;
    historico?: string;
    cliente?: string;
    data_recebimento: string;
    documento?: string;
    id: string;
}

export default function TitulosEcommerce() {
    const [dataPlanilha, setDataPlanilha] = useState<ObjetoPlanilhaFinal[] | null>(null);
    const [tituloAReceber, setTitulosAReceber] = useState<TitulosReceberApiTiny[] | null>(null);
    const [recebidosConciliados, setRecebidosConciliados] = useState<ConciliacaoItem[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [atualizar, setAtualizar] = useState(false)


    useEffect(() => {
        async function getTitulosAReceber() {
            setIsLoading(true);
            setError(null);

            try {
                const response = await buscaTitulosTiny();
                const titulos = response.data;
                setTitulosAReceber(titulos);
            } catch (err) {
                console.error('Erro ao buscar títulos do Tiny:', err);
                setError('Erro ao carregar títulos do Tiny');
            } finally {
                setIsLoading(false);
            }
        }

        getTitulosAReceber();
    }, [atualizar]);

    useEffect(() => {
        if (!dataPlanilha || !tituloAReceber) {
            setRecebidosConciliados(null);
            return;
        }

        try {
            // Conciliação: pegar só os que existem tanto no Tiny quanto na planilha (sem repetições)
            const conciliados: ConciliacaoItem[] = [];
            const idsJaProcessados = new Set<string>(); // Para evitar duplicatas

            dataPlanilha.forEach(planilhaItem => {
                // Se já processamos este ID, pula
                if (idsJaProcessados.has(planilhaItem.id_ecommerce)) {
                    return;
                }

                // Busca o primeiro título relacionado (se houver)
                const tituloRelacionado = tituloAReceber.find(titulo =>
                    titulo.conta.historico?.includes(planilhaItem.id_ecommerce)
                );

                // Se achou título relacionado, adiciona à conciliação
                if (tituloRelacionado) {
                    conciliados.push({
                        id_ecommerce: planilhaItem.id_ecommerce,
                        descricao_anuncio: planilhaItem.nome_anuncio,
                        valor_recebido: +planilhaItem.valor_recebido,
                        valor_titulo: +tituloRelacionado.conta.valor,
                        valor_calculado: calculaTaxas(+tituloRelacionado.conta.valor).valorCalculado,
                        valor_taxas: calculaTaxas(+tituloRelacionado.conta.valor).valorTaxa,
                        historico: tituloRelacionado.conta.historico,
                        cliente: tituloRelacionado.conta.nome_cliente,
                        data_recebimento: planilhaItem.dt_conclusao,
                        documento: tituloRelacionado.conta.numero_doc,
                        id: tituloRelacionado.conta.id
                    });

                    // Marca como processado
                    idsJaProcessados.add(planilhaItem.id_ecommerce);
                }
            });

            setRecebidosConciliados(conciliados);

        } catch (err) {
            console.error('Erro durante conciliação:', err);
            setError('Erro durante o processo de conciliação');
        }

    }, [dataPlanilha, tituloAReceber]);


    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <strong>Erro:</strong> {error}
                </div>
                <ReadXlsx setDataPlanilha={setDataPlanilha} />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
                Conciliação de Títulos E-commerce
            </h1>

            <ReadXlsx setDataPlanilha={setDataPlanilha} />

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Carregando títulos...</span>
                </div>
            )}
             {dataPlanilha && tituloAReceber && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                    <h3 className="font-semibold text-blue-800 mb-2">Resumo:</h3>
                    <p className="text-blue-700">
                        <strong>Planilha:</strong> {dataPlanilha.length} itens |
                        <strong> Títulos Tiny:</strong> {tituloAReceber.length} itens |
                        <strong> Conciliados:</strong> {recebidosConciliados?.length || 0} itens
                    </p>
                </div>
            )}

            {recebidosConciliados && recebidosConciliados.length > 0 && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">
                        Títulos Conciliados ({recebidosConciliados.length})
                    </h2>

                    <TituloLista atualizar={atualizar} setAtualizar={setAtualizar} recebidosConciliados={recebidosConciliados} />
                </div>
            )}

            {recebidosConciliados && recebidosConciliados.length === 0 && (
                <div className="mt-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                    <p>Nenhum título foi encontrado para conciliação. Verifique se:</p>
                    <ul className="list-disc list-inside mt-2">
                        <li>A planilha foi carregada corretamente</li>
                        <li>Os IDs do e-commerce estão presentes no histórico dos títulos do Tiny</li>
                    </ul>
                </div>
            )}

    


        </div>
    );
}