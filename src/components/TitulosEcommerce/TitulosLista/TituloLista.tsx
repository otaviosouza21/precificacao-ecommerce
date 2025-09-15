import { Check, CheckSquare, Square, Plus } from "lucide-react";
import { ConciliacaoItem } from "../TitulosEcommerce";
import { baixarTituloTiny, BaixaTituloParams } from "@/actions/baixaTituloTiny";
import { toast } from "react-toastify";
import { Dispatch, SetStateAction, useState } from "react";
import { calculaTaxas, formatCurrency, formatDate } from "../functions/formataDados";

type TituloListaProps = {
    recebidosConciliados: ConciliacaoItem[]
    setAtualizar: Dispatch<SetStateAction<boolean>>
    atualizar: boolean
}

export default function TituloLista({ recebidosConciliados, atualizar, setAtualizar }: TituloListaProps) {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);

    const baixaTitulo = (dados: BaixaTituloParams) => {
        async function baixar() {
            const retorno = await baixarTituloTiny(dados)
            if (retorno.success) {
                setAtualizar(!atualizar)
                toast.success(retorno.message)
            } else {
                toast.error("Não foi possivel baixar titulo")
            }
        }
        baixar()
    }

    const handleSelectItem = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    }

    const handleSelectAll = () => {
        if (selectedItems.size === recebidosConciliados.length) {
            setSelectedItems(new Set());
        } else {
            const allIds = new Set(recebidosConciliados.map((item, idx) => `${item.id}-${idx}`));
            setSelectedItems(allIds);
        }
    }

    const handleBaixarSelecionados = async () => {
        if (selectedItems.size === 0) {
            toast.warning("Selecione pelo menos um item");
            return;
        }

        setIsProcessing(true);
        let sucessos = 0;
        let erros = 0;

        for (const selectedId of selectedItems) {
            const [id, idxStr] = selectedId.split('-');
            const idx = parseInt(idxStr);
            const item = recebidosConciliados[idx];
            
            if (item) {
                try {
                    const retorno = await baixarTituloTiny({
                        id: item.id,
                        data_recebimento: item.data_recebimento,
                        categoria: 'Venda Shopee',
                        historico: '',
                        valorPago: item.valor_recebido,
                        contaDestino: "Caixa",
                        valorAcrescimo: 0,
                        valorDesconto: 0,
                        valorJuros: 0,
                        valorTaxas: item.valor_taxas
                    });
                    
                    if (retorno.success) {
                        sucessos++;
                    } else {
                        erros++;
                    }
                } catch (error) {
                    erros++;
                }
            }
        }

        setIsProcessing(false);
        setSelectedItems(new Set());
        setAtualizar(!atualizar);
        
        if (sucessos > 0) {
            toast.success(`${sucessos} título(s) baixado(s) com sucesso`);
        }
        if (erros > 0) {
            toast.error(`${erros} título(s) falharam ao baixar`);
        }
    }

    const isAllSelected = selectedItems.size === recebidosConciliados.length && recebidosConciliados.length > 0;
    const isSomeSelected = selectedItems.size > 0 && selectedItems.size < recebidosConciliados.length;

    return (
        <div className="space-y-4">
            {/* Header com ações em lote */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                    >
                        {isAllSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : isSomeSelected ? (
                            <Square className="h-4 w-4 text-blue-600 fill-blue-600/20" />
                        ) : (
                            <Square className="h-4 w-4" />
                        )}
                        {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                    
                    {selectedItems.size > 0 && (
                        <span className="text-sm text-slate-600">
                            {selectedItems.size} de {recebidosConciliados.length} selecionados
                        </span>
                    )}
                </div>

                {selectedItems.size > 0 && (
                    <button
                        onClick={handleBaixarSelecionados}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                    >
                        <Plus className="h-4 w-4" />
                        {isProcessing ? 'Processando...' : `Baixar ${selectedItems.size} título(s)`}
                    </button>
                )}
            </div>

            {/* Tabela */}
            <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-left">
                                    <span className="sr-only">Seleção</span>
                                </th>
                                <th className="px-6 py-4 text-left">
                                    <span className="sr-only">Ações</span>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    ID E-commerce
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Cliente
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <div className="flex flex-col">
                                        <span>Recebido</span>
                                        <span className="text-orange-500 font-bold text-xs">Shopee</span>
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Taxas
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    <div className="flex flex-col">
                                        <span>Título</span>
                                        <span className="text-blue-500 font-bold text-xs">Tiny</span>
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Valor Calculado
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Data Recebido
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Documento
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {recebidosConciliados.map((item, idx) => {
                                const itemId = `${item.id}-${idx}`;
                                const isSelected = selectedItems.has(itemId);
                                const valorDiferenca = Math.abs(item.valor_recebido - item.valor_titulo);
                                const isValorCompativel = valorDiferenca < 0.01;

                                return (
                                    <tr 
                                        key={itemId} 
                                        className={`transition-all duration-200 hover:bg-slate-50 ${
                                            isSelected ? 'bg-blue-50 ring-2 ring-blue-200 ring-inset' : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleSelectItem(itemId)}
                                                className="p-1 hover:bg-slate-100 rounded transition-colors"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="h-5 w-5 text-blue-600" />
                                                ) : (
                                                    <Square className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => baixaTitulo({
                                                    id: item.id,
                                                    data_recebimento: item.data_recebimento,
                                                    categoria: 'Venda Shopee',
                                                    historico: '',
                                                    valorPago: item.valor_recebido,
                                                    contaDestino: "",
                                                    valorAcrescimo: 0,
                                                    valorDesconto: 0,
                                                    valorJuros: 0,
                                                    valorTaxas: item.valor_taxas
                                                })}
                                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                                            >
                                                <Check className="h-4 w-4" />
                                                Baixar
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {item.id_ecommerce}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                            {item.cliente || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {formatCurrency(item.valor_recebido)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                            {formatCurrency(item.valor_taxas)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {formatCurrency(item.valor_titulo)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {formatCurrency(item.valor_calculado)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                            {formatDate(item.data_recebimento)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                                            {item.documento || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                                isValorCompativel
                                                    ? 'bg-green-100 text-green-800 ring-1 ring-green-600/20'
                                                    : 'bg-amber-100 text-amber-800 ring-1 ring-amber-600/20'
                                            }`}>
                                                {isValorCompativel ? (
                                                    <>
                                                        <Check className="h-3 w-3 mr-1" />
                                                        OK
                                                    </>
                                                ) : (
                                                    'Divergente'
                                                )}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {recebidosConciliados.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-slate-400 text-lg mb-2">📋</div>
                        <h3 className="text-sm font-medium text-slate-900">Nenhum título encontrado</h3>
                        <p className="text-sm text-slate-500">Não há títulos para conciliação no momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
}