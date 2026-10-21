"use client";

import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import TabelaFaixasEditor from "@/components/TaxasShopee/TabelaFaixasEditor";
import { MARKETPLACE_SHOPEE_ID, PARAMETROS_PADRAO } from "./defaults";
import { FaixaComissao, Marketplace, ParametrosCalculadora } from "./types";

type Props = {
  aberto: boolean;
  onFechar: () => void;
  parametros: ParametrosCalculadora;
  // Pode lançar (ex.: tabela da Shopee recusada pela API) — o erro é exibido.
  onSalvar: (p: ParametrosCalculadora) => Promise<void>;
};

function gerarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ModalParametros({
  aberto,
  onFechar,
  parametros,
  onSalvar,
}: Props) {
  const [rascunho, setRascunho] = useState<ParametrosCalculadora>(parametros);
  const [mpAtivo, setMpAtivo] = useState<string>(
    parametros.marketplaces[0]?.id ?? ""
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      setRascunho(parametros);
      setMpAtivo(parametros.marketplaces[0]?.id ?? "");
      setErro(null);
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

  function atualizarFaixas(mpId: string, faixas: FaixaComissao[]) {
    atualizarMarketplace(mpId, { faixas });
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
    if (rascunho.marketplaces.length <= 1 || id === MARKETPLACE_SHOPEE_ID) {
      return;
    }
    const restantes = rascunho.marketplaces.filter((m) => m.id !== id);
    setRascunho((prev) => ({ ...prev, marketplaces: restantes }));
    if (mpAtivo === id) setMpAtivo(restantes[0].id);
  }

  function restaurarPadrao() {
    setRascunho(PARAMETROS_PADRAO);
    setMpAtivo(PARAMETROS_PADRAO.marketplaces[0]?.id ?? "");
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar(rascunho);
      onFechar();
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro ao salvar os parâmetros."
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
                    disabled={
                      rascunho.marketplaces.length <= 1 ||
                      marketplaceAtivo.id === MARKETPLACE_SHOPEE_ID
                    }
                    className="self-end flex items-center gap-1 text-xs bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-2 rounded"
                    title="Remover marketplace"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </div>

                {marketplaceAtivo.id === MARKETPLACE_SHOPEE_ID && (
                  <p className="mb-3 text-xs text-amber-300">
                    Tabela compartilhada: as faixas da Shopee também são usadas
                    na baixa de títulos V2 e valem para todos os usuários.
                  </p>
                )}

                <TabelaFaixasEditor
                  faixas={marketplaceAtivo.faixas}
                  onChange={(faixas) =>
                    atualizarFaixas(marketplaceAtivo.id, faixas)
                  }
                />
              </div>
            )}
          </section>
        </div>

        {erro && (
          <div className="mx-5 mb-3 rounded border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-700">
            {erro}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/10">
          <button
            type="button"
            onClick={restaurarPadrao}
            className="flex items-center gap-1 text-xs text-sky-300 hover:text-white"
            title="Preenche com as configurações originais — clique em Salvar para aplicar"
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
