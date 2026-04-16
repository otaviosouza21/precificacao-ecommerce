"use client";

import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Hash,
  Package,
  ShoppingBag,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import LerPlanilhaCustos from "./LerPlanilhaCustos";
import {
  agrupaPorProduto,
  calculaResumo,
  EntradaCusto,
  filtraPorData,
  formataData,
  formataMoeda,
  ProdutoAgrupado,
} from "./processaCustos";

export default function RelatorioCustos() {
  const [entradas, setEntradas] = useState<EntradaCusto[] | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const entradasFiltradas = useMemo(() => {
    if (!entradas) return [];
    return filtraPorData(entradas, dataInicio, dataFim);
  }, [entradas, dataInicio, dataFim]);

  const agrupados = useMemo(
    () => agrupaPorProduto(entradasFiltradas),
    [entradasFiltradas]
  );

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return agrupados;
    const termo = busca.toLowerCase();
    return agrupados.filter(
      (p) =>
        p.produto.toLowerCase().includes(termo) ||
        p.sku.toLowerCase().includes(termo)
    );
  }, [agrupados, busca]);

  const resumo = useMemo(
    () => calculaResumo(entradasFiltradas, agrupados),
    [entradasFiltradas, agrupados]
  );

  const toggleExpand = (sku: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const limparFiltros = () => {
    setDataInicio("");
    setDataFim("");
    setBusca("");
  };

  const temFiltros = dataInicio || dataFim || busca;

  return (
    <div className="p-4">
      <h1 className="text-2xl text-white font-bold mb-1">
        Relatório de Custos de Compra
      </h1>
      <p className="text-sky-200 text-sm mb-6">
        Importe o relatório de notas de compra por produto do Tiny ERP
      </p>

      <LerPlanilhaCustos setEntradas={setEntradas} />

      {entradas && (
        <>
          {/* Mini Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <DashCard
              icon={<Package className="w-5 h-5 text-sky-400" />}
              label="Produtos distintos"
              value={resumo.totalProdutos.toString()}
              bg="from-sky-900/60 to-sky-800/40"
            />
            <DashCard
              icon={<Hash className="w-5 h-5 text-indigo-400" />}
              label="Entradas (NFs)"
              value={resumo.totalEntradas.toString()}
              bg="from-indigo-900/60 to-indigo-800/40"
            />
            <DashCard
              icon={<ShoppingBag className="w-5 h-5 text-emerald-400" />}
              label="Itens comprados"
              value={resumo.quantidadeTotalItens.toLocaleString("pt-BR")}
              bg="from-emerald-900/60 to-emerald-800/40"
            />
            <DashCard
              icon={<DollarSign className="w-5 h-5 text-amber-400" />}
              label="Total investido"
              value={formataMoeda(resumo.valorTotalCompras)}
              bg="from-amber-900/60 to-amber-800/40"
            />
          </div>

          {/* Período do dashboard */}
          {resumo.periodoInicio && (
            <div className="mb-5 flex items-center gap-2 text-xs text-sky-200">
              <BarChart3 className="w-4 h-4" />
              <span>
                Período:{" "}
                <strong className="text-white">
                  {formataData(resumo.periodoInicio)}
                </strong>{" "}
                até{" "}
                <strong className="text-white">
                  {formataData(resumo.periodoFim)}
                </strong>
              </span>
              {temFiltros && (
                <span className="ml-1 bg-sky-700 text-sky-100 px-2 py-0.5 rounded-full text-xs">
                  filtros ativos
                </span>
              )}
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-sky-300 font-medium">
                  Data início
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-sky-300 font-medium">
                  Data fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-48">
                <label className="text-xs text-sky-300 font-medium">
                  Buscar produto / SKU
                </label>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Digite o nome ou código..."
                  className="bg-sky-950 border border-sky-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-sky-600"
                />
              </div>
              {temFiltros && (
                <button
                  onClick={limparFiltros}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-900/50 hover:bg-red-800/50 border border-red-700/50 text-red-300 rounded-lg text-sm transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Tabela de produtos */}
          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-sky-400 text-sm">
              Nenhum produto encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-white/10">
              {/* Cabeçalho */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] bg-sky-900/80 text-sky-200 text-xs font-semibold uppercase px-4 py-3 gap-2">
                <span>Produto / SKU</span>
                <span className="text-right">Qtd. Total</span>
                <span className="text-right">Último Preço</span>
                <span className="text-right">Custo Médio</span>
                <span className="text-right">Total Comprado</span>
                <span />
              </div>

              {/* Linhas */}
              <div className="divide-y divide-white/5">
                {produtosFiltrados.map((produto) => (
                  <ProdutoLinha
                    key={produto.sku}
                    produto={produto}
                    expandido={expandidos.has(produto.sku)}
                    onToggle={() => toggleExpand(produto.sku)}
                  />
                ))}
              </div>

              {/* Rodapé totais */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] bg-sky-900/60 text-white text-xs font-bold px-4 py-3 gap-2 border-t border-sky-700/50">
                <span className="text-sky-200">
                  {produtosFiltrados.length} produto
                  {produtosFiltrados.length !== 1 ? "s" : ""}
                </span>
                <span className="text-right">
                  {produtosFiltrados
                    .reduce((s, p) => s + p.quantidadeTotal, 0)
                    .toLocaleString("pt-BR")}
                </span>
                <span />
                <span />
                <span className="text-right text-amber-300">
                  {formataMoeda(
                    produtosFiltrados.reduce((s, p) => s + p.valorTotalGeral, 0)
                  )}
                </span>
                <span />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Sub-componentes ---

function DashCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${bg} border border-white/10 rounded-xl p-4 flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2 text-xs text-sky-300 font-medium">
        {icon}
        {label}
      </div>
      <p className="text-white font-bold text-lg leading-none">{value}</p>
    </div>
  );
}

function ProdutoLinha({
  produto,
  expandido,
  onToggle,
}: {
  produto: ProdutoAgrupado;
  expandido: boolean;
  onToggle: () => void;
}) {
  const nEntradas = produto.entradas.length;
  const variacaoPreco =
    produto.entradas.length > 1
      ? Math.max(...produto.entradas.map((e) => e.precoUnitario)) -
        Math.min(...produto.entradas.map((e) => e.precoUnitario))
      : 0;

  return (
    <>
      {/* Linha principal */}
      <div
        className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] px-4 py-3 gap-2 items-center transition-colors cursor-pointer text-sm ${
          expandido
            ? "bg-sky-800/30"
            : "bg-transparent hover:bg-white/5"
        }`}
        onClick={onToggle}
      >
        <div>
          <p className="text-white font-medium text-sm leading-tight">
            {produto.produto}
          </p>
          <p className="text-sky-400 text-xs mt-0.5">
            SKU: {produto.sku}
            {nEntradas > 1 && (
              <span className="ml-2 text-sky-500">· {nEntradas} entradas</span>
            )}
            {variacaoPreco > 0 && (
              <span className="ml-2 text-amber-400">
                · variação {formataMoeda(variacaoPreco)}
              </span>
            )}
          </p>
        </div>
        <span className="text-right text-sky-100">
          {produto.quantidadeTotal.toLocaleString("pt-BR")}
        </span>
        <span className="text-right text-sky-100">
          {formataMoeda(produto.ultimoPreco)}
        </span>
        <span className="text-right font-semibold text-emerald-300">
          {formataMoeda(produto.custoMedio)}
        </span>
        <span className="text-right text-amber-200 font-medium">
          {formataMoeda(produto.valorTotalGeral)}
        </span>
        <div className="flex justify-center text-sky-400">
          {expandido ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Entradas expandidas */}
      {expandido && (
        <div className="bg-sky-950/60 border-t border-white/5">
          {/* Header entradas */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_40px] px-8 py-2 gap-2 text-xs text-sky-400 font-semibold uppercase bg-sky-950/40">
            <span>N° NF</span>
            <span>Data</span>
            <span className="text-right">Quantidade</span>
            <span className="text-right">Preço Unit.</span>
            <span className="text-right">Valor Total</span>
            <span />
          </div>
          {produto.entradas
            .slice()
            .sort((a, b) => a.dataISO.localeCompare(b.dataISO))
            .map((entrada, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_40px] px-8 py-2 gap-2 text-xs text-sky-200 border-t border-white/5 hover:bg-white/5"
              >
                <span className="font-mono text-sky-400">{entrada.nf}</span>
                <span>{entrada.data}</span>
                <span className="text-right">
                  {entrada.quantidade.toLocaleString("pt-BR")}
                </span>
                <span className="text-right">
                  {formataMoeda(entrada.precoUnitario)}
                </span>
                <span className="text-right text-emerald-300">
                  {formataMoeda(entrada.valorTotal)}
                </span>
                <span />
              </div>
            ))}
          {/* Subtotal do produto */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_40px] px-8 py-2 gap-2 text-xs font-bold text-white bg-sky-900/40 border-t border-sky-700/30">
            <span className="text-sky-300">Subtotal</span>
            <span />
            <span className="text-right">
              {produto.quantidadeTotal.toLocaleString("pt-BR")}
            </span>
            <span className="text-right text-emerald-300">
              {formataMoeda(produto.custoMedio)}{" "}
              <span className="font-normal text-sky-400">(médio)</span>
            </span>
            <span className="text-right text-amber-300">
              {formataMoeda(produto.valorTotalGeral)}
            </span>
            <span />
          </div>
        </div>
      )}
    </>
  );
}
