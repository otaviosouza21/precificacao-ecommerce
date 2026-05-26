"use client";

import { brlConvert } from "@/functions/brlConvert";
import { Marketplace, ProdutoCalculadora } from "./types";

type Props = {
  produto: ProdutoCalculadora;
  custoOverride: number | null;
  onCustoOverrideChange: (valor: number | null) => void;
  margemDesejadaPct: number;
  onMargemChange: (valor: number) => void;
  embalagem: number;
  onEmbalagemChange: (valor: number) => void;
  marketplaces: Marketplace[];
  marketplaceId: string;
  onMarketplaceChange: (id: string) => void;
  custoMargemBase: number;
};

export default function CardDadosProduto({
  produto,
  custoOverride,
  onCustoOverrideChange,
  margemDesejadaPct,
  onMargemChange,
  embalagem,
  onEmbalagemChange,
  marketplaces,
  marketplaceId,
  onMarketplaceChange,
  custoMargemBase,
}: Props) {
  const custoEfetivo = custoOverride ?? produto.custo;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="bg-sky-700 px-4 py-2 text-white font-semibold text-sm tracking-wide">
        DADOS DO PRODUTO
      </div>

      <div className="divide-y divide-white/10">
        <Linha label="SKU">
          <span className="font-mono text-sky-300">{produto.sku}</span>
        </Linha>
        <Linha label="Descrição">
          <span className="text-white">{produto.nome}</span>
        </Linha>
        <Linha label="Custo do produto (R$)">
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={custoEfetivo}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onCustoOverrideChange(Number.isFinite(v) ? v : null);
              }}
              className="w-28 bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white text-right"
            />
            {custoOverride != null && custoOverride !== produto.custo && (
              <button
                type="button"
                onClick={() => onCustoOverrideChange(null)}
                className="text-xs text-sky-400 hover:text-sky-200 underline"
                title={`Restaurar custo do Tiny (${brlConvert(produto.custo)})`}
              >
                resetar
              </button>
            )}
          </div>
        </Linha>
        <Linha label="Margem desejada (%)">
          <input
            type="number"
            step="0.1"
            min="0"
            value={margemDesejadaPct}
            onChange={(e) => onMargemChange(parseFloat(e.target.value) || 0)}
            className="w-28 bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white text-right"
          />
        </Linha>
        <Linha label="Embalagem (R$)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={embalagem}
            onChange={(e) => onEmbalagemChange(parseFloat(e.target.value) || 0)}
            className="w-28 bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white text-right"
          />
        </Linha>
        <Linha label="Marketplace">
          <select
            value={marketplaceId}
            onChange={(e) => onMarketplaceChange(e.target.value)}
            className="bg-sky-950 border border-sky-700 rounded px-2 py-1 text-white"
          >
            {marketplaces.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Linha>
        <Linha label="Custo + Margem (base)" destaque>
          <span className="text-emerald-300 font-bold">
            {brlConvert(custoMargemBase)}
          </span>
        </Linha>
      </div>
    </div>
  );
}

function Linha({
  label,
  destaque,
  children,
}: {
  label: string;
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-2 ${
        destaque ? "bg-sky-900/40" : ""
      }`}
    >
      <span className="text-sm text-sky-200">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
