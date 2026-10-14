"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FaixaComissao } from "@/lib/taxasShopee";

type Props = {
  faixas: FaixaComissao[];
  onChange: (faixas: FaixaComissao[]) => void;
};

function gerarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Edição das faixas (preço mín./máx., comissão %, taxa fixa). Usada pela tela
// "Taxas Shopee" da baixa V2 e pelos parâmetros da calculadora de precificação.
export default function TabelaFaixasEditor({ faixas, onChange }: Props) {
  function atualizar(id: string, alt: Partial<FaixaComissao>) {
    onChange(faixas.map((f) => (f.id === id ? { ...f, ...alt } : f)));
  }

  function adicionar() {
    onChange([
      ...faixas,
      {
        id: gerarId("faixa"),
        precoMin: 0,
        precoMax: null,
        comissaoPct: 0,
        taxaFixa: 0,
      },
    ]);
  }

  function remover(id: string) {
    onChange(faixas.filter((f) => f.id !== id));
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-sky-300 text-left border-b border-white/10">
              <th className="px-2 py-2 font-medium">Preço Mín.</th>
              <th className="px-2 py-2 font-medium">Preço Máx. (vazio = ∞)</th>
              <th className="px-2 py-2 font-medium">Comissão (%)</th>
              <th className="px-2 py-2 font-medium">Taxa Fixa (R$)</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f) => (
              <tr key={f.id} className="border-b border-white/5">
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={f.precoMin}
                    onChange={(e) =>
                      atualizar(f.id, {
                        precoMin: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-24 bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white text-right"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={f.precoMax ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      atualizar(f.id, {
                        precoMax: v === "" ? null : parseFloat(v),
                      });
                    }}
                    placeholder="∞"
                    className="w-24 bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white text-right"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={f.comissaoPct}
                    onChange={(e) =>
                      atualizar(f.id, {
                        comissaoPct: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-24 bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white text-right"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={f.taxaFixa}
                    onChange={(e) =>
                      atualizar(f.id, {
                        taxaFixa: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-24 bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white text-right"
                  />
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => remover(f.id)}
                    className="text-red-400 hover:text-red-300"
                    title="Remover faixa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={adicionar}
        className="mt-3 flex items-center gap-1 text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded"
      >
        <Plus className="w-3.5 h-3.5" /> Adicionar faixa
      </button>
    </>
  );
}
