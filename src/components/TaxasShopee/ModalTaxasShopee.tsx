"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  TAXAS_SHOPEE_PADRAO,
  type FaixaComissao,
  type TaxasShopee,
} from "@/lib/taxasShopee";
import TabelaFaixasEditor from "./TabelaFaixasEditor";

type Props = {
  aberto: boolean;
  onFechar: () => void;
  taxas: TaxasShopee;
  // Deve lançar em caso de erro (a mensagem é exibida no modal).
  onSalvar: (faixas: FaixaComissao[]) => Promise<unknown>;
};

function formataAlteracao(taxas: TaxasShopee): string {
  if (taxas.padrao || !taxas.atualizadoEm) {
    return "Usando a tabela padrão (ainda não alterada).";
  }
  const quando = new Date(taxas.atualizadoEm).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return `Última alteração: ${quando}${
    taxas.atualizadoPor ? ` por ${taxas.atualizadoPor}` : ""
  }.`;
}

export default function ModalTaxasShopee({
  aberto,
  onFechar,
  taxas,
  onSalvar,
}: Props) {
  const [rascunho, setRascunho] = useState<FaixaComissao[]>(taxas.faixas);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      setRascunho(taxas.faixas);
      setErro(null);
    }
  }, [aberto, taxas]);

  if (!aberto) return null;

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar(rascunho);
      onFechar();
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro ao salvar as taxas.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onFechar}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Taxas e comissões da Shopee
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="text-sky-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="text-xs text-sky-200 space-y-1">
            <p>
              A faixa é escolhida pelo <strong>preço unitário</strong> do item.
              A comissão (%) incide sobre o preço e a taxa fixa é cobrada{" "}
              <strong>por unidade</strong>.
            </p>
            <p>
              Vale para todos os usuários: baixa de títulos V2 e calculadora de
              precificação (marketplace Shopee).
            </p>
            <p className="text-sky-400">{formataAlteracao(taxas)}</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <TabelaFaixasEditor faixas={rascunho} onChange={setRascunho} />
          </div>

          {erro && (
            <div className="rounded border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => setRascunho(TAXAS_SHOPEE_PADRAO)}
            className="flex items-center gap-1 text-xs text-sky-300 hover:text-white"
            title="Preenche com a tabela padrão — clique em Salvar para aplicar"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onFechar}
              className="text-sm text-sky-300 hover:text-white px-4 py-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
