"use client";

import {
  BarChart3,
  DollarSign,
  Hash,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useMemo } from "react";
import type { ProdutoRelatorio } from "../types";
import { formataData, formataMoeda } from "../utils";
import DashCard from "./DashCard";
import ProdutoLinhaPlanilha from "./ProdutoLinhaPlanilha";

export default function ResultadoPlanilha({
  produtos,
  expandidos,
  onToggle,
  dataInicio,
  dataFim,
  totalPedidos,
  vendasCarregadas,
}: {
  produtos: ProdutoRelatorio[];
  expandidos: Set<string>;
  onToggle: (sku: string) => void;
  dataInicio: string;
  dataFim: string;
  totalPedidos: number;
  vendasCarregadas: boolean;
}) {
  const totais = useMemo(() => {
    let qtd = 0;
    let valor = 0;
    let saidas = 0;
    for (const p of produtos) {
      qtd += p.quantidadeTotal;
      valor += p.valorTotalGeral;
      saidas += p.saidasNoPeriodo;
    }
    return { qtd, valor, saidas };
  }, [produtos]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <DashCard
          icon={<Package className="w-5 h-5 text-sky-400" />}
          label="Produtos"
          value={produtos.length.toString()}
          bg="from-sky-900/60 to-sky-800/40"
        />
        <DashCard
          icon={<Hash className="w-5 h-5 text-indigo-400" />}
          label="Entradas (linhas)"
          value={produtos.reduce((s, p) => s + p.notas.length, 0).toString()}
          bg="from-indigo-900/60 to-indigo-800/40"
        />
        <DashCard
          icon={<ShoppingBag className="w-5 h-5 text-emerald-400" />}
          label="Itens comprados"
          value={totais.qtd.toLocaleString("pt-BR")}
          bg="from-emerald-900/60 to-emerald-800/40"
        />
        <DashCard
          icon={<DollarSign className="w-5 h-5 text-amber-400" />}
          label="Total investido"
          value={formataMoeda(totais.valor)}
          bg="from-amber-900/60 to-amber-800/40"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-sky-200">
        <BarChart3 className="w-4 h-4" />
        <span>
          Período:{" "}
          <strong className="text-white">{formataData(dataInicio)}</strong> até{" "}
          <strong className="text-white">{formataData(dataFim)}</strong>
        </span>
        {vendasCarregadas && (
          <>
            <span className="text-sky-400">·</span>
            <span>
              {totalPedidos} pedido{totalPedidos !== 1 ? "s" : ""} entregues no
              período
            </span>
          </>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-white/10">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1.2fr_40px] bg-sky-900/80 text-sky-200 text-xs font-semibold uppercase px-4 py-3 gap-2">
          <span>Produto / SKU</span>
          <span className="text-right">Qtd. Entradas</span>
          <span className="text-right">Último Preço</span>
          <span className="text-right">Custo Médio</span>
          <span className="text-right">Total Comprado</span>
          <span className="text-right">Vendas no Período</span>
          <span />
        </div>
        <div className="divide-y divide-white/5">
          {produtos.map((p) => (
            <ProdutoLinhaPlanilha
              key={p.sku}
              produto={p}
              expandido={expandidos.has(p.sku)}
              onToggle={() => onToggle(p.sku)}
              vendasCarregadas={vendasCarregadas}
            />
          ))}
        </div>
      </div>
    </>
  );
}
