"use client";

import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FaixaComissao, Marketplace, ParametrosCalculadora } from "./types";

type Props = {
  aberto: boolean;
  onFechar: () => void;
  parametros: ParametrosCalculadora;
  onSalvar: (p: ParametrosCalculadora) => void;
  onRestaurarPadrao: () => void;
};

function gerarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ModalParametros({
  aberto,
  onFechar,
  parametros,
  onSalvar,
  onRestaurarPadrao,
}: Props) {
  const [rascunho, setRascunho] = useState<ParametrosCalculadora>(parametros);
  const [mpAtivo, setMpAtivo] = useState<string>(
    parametros.marketplaces[0]?.id ?? ""
  );

  useEffect(() => {
    if (aberto) {
      setRascunho(parametros);
      setMpAtivo(parametros.marketplaces[0]?.id ?? "");
    }
  }, [aberto, parametros]);

  if (!aberto) return null;

  const marketplaceAtivo =
    rascunho.marketplaces.find((m) => m.id === mpAtivo) ??
    rascunho.marketplaces[0] ??
    null;

  function atualizarMarketplace(id: string, alt: Partial<Marketplace>) {
    setRascunho((prev) => ({
      ...prev,
      marketplaces: prev.marketplaces.map((m) =>
        m.id === id ? { ...m, ...alt } : m
      ),
    }));
  }

  function atualizarFaixa(
    mpId: string,
    faixaId: string,
    alt: Partial<FaixaComissao>
  ) {
    setRascunho((prev) => ({
      ...prev,
      marketplaces: prev.marketplaces.map((m) =>
        m.id !== mpId
          ? m
          : {
              ...m,
              faixas: m.faixas.map((f) =>
                f.id === faixaId ? { ...f, ...alt } : f
              ),
            }
      ),
    }));
  }

  function adicionarFaixa(mpId: string) {
    setRascunho((prev) => ({
      ...prev,
      marketplaces: prev.marketplaces.map((m) =>
        m.id !== mpId
          ? m
          : {
              ...m,
              faixas: [
                ...m.faixas,
                {
                  id: gerarId("faixa"),
                  precoMin: 0,
                  precoMax: null,
                  comissaoPct: 0,
                  taxaFixa: 0,
                },
              ],
            }
      ),
    }));
  }

  function removerFaixa(mpId: string, faixaId: string) {
    setRascunho((prev) => ({
      ...prev,
      marketplaces: prev.marketplaces.map((m) =>
        m.id !== mpId
          ? m
          : { ...m, faixas: m.faixas.filter((f) => f.id !== faixaId) }
      ),
    }));
  }

  function adicionarMarketplace() {
    const novo: Marketplace = {
      id: gerarId("mp"),
      nome: "Novo marketplace",
      faixas: [
        {
          id: gerarId("faixa"),
          precoMin: 0,
          precoMax: null,
          comissaoPct: 0,
          taxaFixa: 0,
        },
      ],
    };
    setRascunho((prev) => ({
      ...prev,
      marketplaces: [...prev.marketplaces, novo],
    }));
    setMpAtivo(novo.id);
  }

  function removerMarketplace(id: string) {
    if (rascunho.marketplaces.length <= 1) return;
    const restantes = rascunho.marketplaces.filter((m) => m.id !== id);
    setRascunho((prev) => ({ ...prev, marketplaces: restantes }));
    if (mpAtivo === id) setMpAtivo(restantes[0].id);
  }

  function salvar() {
    onSalvar(rascunho);
    onFechar();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onFechar}
    >
      <div
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Parâmetros da calculadora
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="text-sky-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-sky-300 font-medium block mb-1">
                Margem desejada padrão (%)
              </span>
              <input
                type="number"
                step="0.1"
                min="0"
                value={rascunho.margemDesejadaPct}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    margemDesejadaPct: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-sky-950 border border-sky-700 rounded px-3 py-2 text-white"
              />
            </label>
            <label className="block">
              <span className="text-xs text-sky-300 font-medium block mb-1">
                Embalagem padrão (R$)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rascunho.embalagem}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    embalagem: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-sky-950 border border-sky-700 rounded px-3 py-2 text-white"
              />
            </label>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Marketplaces</h3>
              <button
                type="button"
                onClick={adicionarMarketplace}
                className="flex items-center gap-1 text-xs bg-sky-700 hover:bg-sky-600 text-white px-2.5 py-1.5 rounded"
              >
                <Plus className="w-3.5 h-3.5" /> Novo marketplace
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {rascunho.marketplaces.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMpAtivo(m.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${
                    m.id === mpAtivo
                      ? "bg-sky-700 border-sky-500 text-white"
                      : "bg-sky-950 border-sky-800 text-sky-300 hover:bg-sky-900"
                  }`}
                >
                  {m.nome}
                </button>
              ))}
            </div>

            {marketplaceAtivo && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex-1">
                    <span className="text-xs text-sky-300 font-medium block mb-1">
                      Nome
                    </span>
                    <input
                      type="text"
                      value={marketplaceAtivo.nome}
                      onChange={(e) =>
                        atualizarMarketplace(marketplaceAtivo.id, {
                          nome: e.target.value,
                        })
                      }
                      className="w-full bg-sky-950 border border-sky-700 rounded px-3 py-2 text-white"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removerMarketplace(marketplaceAtivo.id)}
                    disabled={rascunho.marketplaces.length <= 1}
                    className="self-end flex items-center gap-1 text-xs bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-2 rounded"
                    title="Remover marketplace"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-sky-300 text-left border-b border-white/10">
                        <th className="px-2 py-2 font-medium">Preço Mín.</th>
                        <th className="px-2 py-2 font-medium">
                          Preço Máx. (vazio = ∞)
                        </th>
                        <th className="px-2 py-2 font-medium">Comissão (%)</th>
                        <th className="px-2 py-2 font-medium">Taxa Fixa (R$)</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketplaceAtivo.faixas.map((f) => (
                        <tr key={f.id} className="border-b border-white/5">
                          <td className="px-2 py-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={f.precoMin}
                              onChange={(e) =>
                                atualizarFaixa(marketplaceAtivo.id, f.id, {
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
                                atualizarFaixa(marketplaceAtivo.id, f.id, {
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
                                atualizarFaixa(marketplaceAtivo.id, f.id, {
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
                                atualizarFaixa(marketplaceAtivo.id, f.id, {
                                  taxaFixa: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-24 bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white text-right"
                            />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                removerFaixa(marketplaceAtivo.id, f.id)
                              }
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
                  onClick={() => adicionarFaixa(marketplaceAtivo.id)}
                  className="mt-3 flex items-center gap-1 text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar faixa
                </button>
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/10">
          <button
            type="button"
            onClick={onRestaurarPadrao}
            className="flex items-center gap-1 text-xs text-sky-300 hover:text-white"
            title="Restaurar configurações originais"
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
              className="text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
