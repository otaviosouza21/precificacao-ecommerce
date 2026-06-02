"use client";

import TitlePrimary from "@/components/Ui/TitlePrimary";
import { Calculator, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BuscaProduto from "./BuscaProduto";
import CardDadosProduto from "./CardDadosProduto";
import {
  calcularResultadoMinimo,
  calcularValidacao,
} from "./calculos";
import ModalParametros from "./ModalParametros";
import PrecoMinimoCard from "./PrecoMinimoCard";
import TabelaComissoesCard from "./TabelaComissoesCard";
import { ProdutoCalculadora } from "./types";
import { useParametrosCalculadora } from "./useParametrosCalculadora";
import ValidacaoPrecoCard from "./ValidacaoPrecoCard";

export default function CalculadoraEcommerce() {
  const { parametros, setParametros, restaurarPadrao } =
    useParametrosCalculadora();

  const [produto, setProduto] = useState<ProdutoCalculadora | null>(null);
  const [custoOverride, setCustoOverride] = useState<number | null>(null);
  const [margemDesejadaPct, setMargemDesejadaPct] = useState<number>(
    parametros.margemDesejadaPct
  );
  const [embalagem, setEmbalagem] = useState<number>(parametros.embalagem);
  const [marketplaceId, setMarketplaceId] = useState<string>(
    parametros.marketplaces[0]?.id ?? ""
  );
  const [precoVenda, setPrecoVenda] = useState<string>("");
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    setMargemDesejadaPct(parametros.margemDesejadaPct);
    setEmbalagem(parametros.embalagem);
    if (!parametros.marketplaces.some((m) => m.id === marketplaceId)) {
      setMarketplaceId(parametros.marketplaces[0]?.id ?? "");
    }
  }, [parametros, marketplaceId]);

  const marketplaceAtual = useMemo(
    () =>
      parametros.marketplaces.find((m) => m.id === marketplaceId) ??
      parametros.marketplaces[0] ??
      null,
    [parametros.marketplaces, marketplaceId]
  );

  const custoEfetivo = custoOverride ?? produto?.custo ?? 0;

  const resultadoMinimo = useMemo(() => {
    if (!produto || !marketplaceAtual) return null;
    return calcularResultadoMinimo(
      custoEfetivo,
      margemDesejadaPct,
      embalagem,
      marketplaceAtual.faixas
    );
  }, [produto, marketplaceAtual, custoEfetivo, margemDesejadaPct, embalagem]);

  const validacao = useMemo(() => {
    if (!produto || !marketplaceAtual) return null;
    const valor = parseFloat(precoVenda);
    if (!Number.isFinite(valor) || valor <= 0) return null;
    return calcularValidacao(
      valor,
      custoEfetivo,
      margemDesejadaPct,
      embalagem,
      marketplaceAtual.faixas
    );
  }, [
    produto,
    marketplaceAtual,
    precoVenda,
    custoEfetivo,
    margemDesejadaPct,
    embalagem,
  ]);

  return (
    <div className="p-4 bg-slate-800 m-4 rounded-2xl text-white min-h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-sky-300" />
          <TitlePrimary
            title="Calculadora de Preços do Ecommerce"
            subtitle="Calcule o preço mínimo de venda baseado nas comissões do marketplace"
          />
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-2 bg-sky-700 hover:bg-sky-600 text-white text-sm px-3 py-2 rounded-lg"
        >
          <Settings className="w-4 h-4" />
          Parâmetros
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3">
          <BuscaProduto
            selecionado={produto}
            onSelecionar={(p) => {
              setProduto(p);
              setCustoOverride(null);
              setPrecoVenda("");
            }}
            onLimpar={() => {
              setProduto(null);
              setCustoOverride(null);
              setPrecoVenda("");
            }}
          />
        </div>

        {produto && marketplaceAtual && resultadoMinimo && (
          <>
            <div className="lg:col-span-1">
              <CardDadosProduto
                produto={produto}
                custoOverride={custoOverride}
                onCustoOverrideChange={setCustoOverride}
                margemDesejadaPct={margemDesejadaPct}
                onMargemChange={setMargemDesejadaPct}
                embalagem={embalagem}
                onEmbalagemChange={setEmbalagem}
                marketplaces={parametros.marketplaces}
                marketplaceId={marketplaceAtual.id}
                onMarketplaceChange={setMarketplaceId}
                custoMargemBase={resultadoMinimo.custoMargemBase}
              />
            </div>

            <div className="lg:col-span-2">
              <TabelaComissoesCard
                marketplaceNome={marketplaceAtual.nome}
                resultado={resultadoMinimo}
              />
            </div>

            <div className="lg:col-span-1">
              <PrecoMinimoCard resultado={resultadoMinimo} />
            </div>

            <div className="lg:col-span-2">
              <ValidacaoPrecoCard
                precoVenda={precoVenda}
                onPrecoVendaChange={setPrecoVenda}
                validacao={validacao}
                margemDesejadaPct={margemDesejadaPct}
              />
            </div>
          </>
        )}

        {!produto && (
          <div className="lg:col-span-3 bg-white/5 border border-white/10 border-dashed rounded-xl p-10 text-center text-sky-300">
            Selecione um produto acima para começar a precificar.
          </div>
        )}
      </div>

      <ModalParametros
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        parametros={parametros}
        onSalvar={setParametros}
        onRestaurarPadrao={restaurarPadrao}
      />
    </div>
  );
}
