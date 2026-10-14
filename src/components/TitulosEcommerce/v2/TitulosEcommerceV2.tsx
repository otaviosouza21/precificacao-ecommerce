"use client";

import { useEffect, useMemo, useState } from "react";
import { Percent, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { buscarTitulosAbertosV2 } from "@/actions/buscarTitulosAbertosV2";
import { TitulosReceberApiTiny } from "@/api/types/api-types";
import {
  detalharVariosPedidos,
  FinanceiroApiError,
  listarRenda,
  type DetalheRenda,
  type LancamentoRenda,
} from "@/lib/financeiro";
import { toast } from "react-toastify";
import {
  listarPrecosAnuncios,
  sincronizarPrecosAnuncios,
} from "@/lib/anuncios";
import { useTaxasShopee, type FaixaComissao } from "@/lib/taxasShopee";
import ModalTaxasShopee from "@/components/TaxasShopee/ModalTaxasShopee";
import TituloLista from "../TitulosLista/TituloLista";
import { ConciliacaoItem } from "../TitulosEcommerce";
import PeriodoRendaForm from "./PeriodoRendaForm";
import { calculaLiquidoV2 } from "./calculoV2";

// ---------------------------------------------------------------------------
// Helpers de data
// ---------------------------------------------------------------------------

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

// Converte um ISO (UTC) para a data-calendário no fuso da loja (Brasil, UTC-3).
function isoParaDataBR(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso.slice(0, 10);
  return new Date(t - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// A data de criação do pedido está no próprio order_sn (prefixo AAMMDD da
// Shopee). Ex.: "260620K9DT00BD" → 2026-06-20. Cai no recebimento se não casar.
function dataCriacaoDoPedido(orderSn: string, fallbackIso: string): string {
  const m = orderSn.match(/^(\d{2})(\d{2})(\d{2})/);
  if (m) {
    const [, aa, mm, dd] = m;
    const mes = Number(mm);
    const dia = Number(dd);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      return `20${aa}-${mm}-${dd}`;
    }
  }
  return isoParaDataBR(fallbackIso);
}

// ---------------------------------------------------------------------------

// Agrupamento da renda por pedido (1 linha por order_sn, como na planilha).
type GrupoRenda = {
  pedido: string;
  cliente: string;
  valorRecebido: number; // soma das entradas (MONEY_IN) do pedido
  dataRecebimento: string; // ISO do recebimento mais recente
};

function agrupaPorPedido(itens: LancamentoRenda[]): GrupoRenda[] {
  const mapa = new Map<string, GrupoRenda>();
  for (const item of itens) {
    if (item.fluxo !== "MONEY_IN") continue;
    const pedido = item.pedido?.trim();
    if (!pedido) continue; // ajustes sem pedido não conciliam com título

    const atual = mapa.get(pedido);
    if (!atual) {
      mapa.set(pedido, {
        pedido,
        cliente: item.cliente,
        valorRecebido: item.valor,
        dataRecebimento: item.dataRecebimento,
      });
    } else {
      atual.valorRecebido += item.valor;
      if (item.cliente && !atual.cliente) atual.cliente = item.cliente;
      if (item.dataRecebimentoUnix && item.dataRecebimento) {
        if (
          new Date(item.dataRecebimento).getTime() >
          new Date(atual.dataRecebimento).getTime()
        ) {
          atual.dataRecebimento = item.dataRecebimento;
        }
      }
    }
  }
  return [...mapa.values()];
}

// ---------------------------------------------------------------------------

// Dados brutos da conciliação (renda × título × detalhe Shopee). O cálculo das
// taxas fica fora daqui para refazer na hora quando a tabela de taxas muda,
// sem buscar tudo de novo na Shopee.
type ParConciliado = {
  grupo: GrupoRenda;
  titulo: TitulosReceberApiTiny;
  detalhe: DetalheRenda | undefined;
};

type DadosConciliacao = {
  pares: ParConciliado[];
  precosRef: Map<string, number>;
};

function montaConciliacao(
  { grupo, titulo, detalhe }: ParConciliado,
  precosRef: Map<string, number>,
  faixas: FaixaComissao[],
): ConciliacaoItem {
  const valorRecebido = +grupo.valorRecebido.toFixed(2);

  // Cálculo POR ITEM: base = PREÇO DE REFERÊNCIA do nosso banco (por
  // SKU/variação × qtd); fallback para o vendido na Shopee quando o SKU
  // não tem referência. Taxa fixa por unidade; faixa pela unidade (tabela
  // "Taxas Shopee"); + afiliados. Sem detalhe, cai no valor do título do Tiny.
  const r = calculaLiquidoV2(
    detalhe?.composicao,
    valorRecebido,
    +titulo.conta.valor,
    precosRef,
    faixas,
  );

  // Coluna de comparação: preço vendido na Shopee × base (referência).
  // Alerta quando a venda diferiu da referência (e a referência foi usada).
  const precoRef = r.baseShopee;
  const divergeRef =
    r.usouReferencia && Math.abs(r.baseShopee - r.base) >= 0.01;

  return {
    id_ecommerce: grupo.pedido,
    sku: "",
    preco_base: r.base,
    precoRef,
    divergeRef,
    descricao_anuncio: detalhe?.cliente || grupo.cliente || grupo.pedido,
    dt_criacao_pedido: dataCriacaoDoPedido(
      grupo.pedido,
      grupo.dataRecebimento,
    ),
    valor_recebido: valorRecebido,
    valor_titulo: +titulo.conta.valor,
    subisidio_pix: 0,
    valor_calculado: r.liquido,
    valor_taxas: r.taxa,
    preco_com_rebate: r.base,
    valor_rebate: 0,
    cupom_rebate: 0,
    historico: titulo.conta.historico,
    cliente: titulo.conta.nome_cliente || grupo.cliente,
    data_recebimento: isoParaDataBR(grupo.dataRecebimento),
    documento: titulo.conta.numero_doc,
    id: titulo.conta.id,
    regra: r.regra,
    // Negativo apenas para exibição (indica dedução no tooltip/alerta).
    taxa_afiliados: -r.afiliados,
    houveArredondamento: r.houveArredondamento,
    detalheV2: r.detalhe,
  };
}

// ---------------------------------------------------------------------------

export default function TitulosEcommerceV2() {
  const { token } = useAuth();
  const {
    taxas,
    pronto: taxasProntas,
    erroCarga: erroTaxas,
    salvar: salvarTaxas,
  } = useTaxasShopee();
  const [modalTaxasAberto, setModalTaxasAberto] = useState(false);

  const [de, setDe] = useState(() =>
    isoLocal(new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)),
  );
  const [ate, setAte] = useState(() => isoLocal(new Date()));

  const [lancamentos, setLancamentos] = useState<LancamentoRenda[] | null>(
    null,
  );
  const [tituloAReceber, setTitulosAReceber] = useState<
    TitulosReceberApiTiny[] | null
  >(null);
  const [dadosConciliacao, setDadosConciliacao] =
    useState<DadosConciliacao | null>(null);

  // Recalcula na hora quando a tabela de taxas muda. Espera a tabela carregar
  // para nunca mostrar valores calculados com a tabela errada.
  const recebidosConciliados = useMemo<ConciliacaoItem[] | null>(() => {
    if (!dadosConciliacao || !taxasProntas) return null;
    return dadosConciliacao.pares.map((par) =>
      montaConciliacao(par, dadosConciliacao.precosRef, taxas.faixas),
    );
  }, [dadosConciliacao, taxasProntas, taxas.faixas]);

  const [isLoadingTitulos, setIsLoadingTitulos] = useState(false);
  const [isBuscandoRenda, setIsBuscandoRenda] = useState(false);
  const [isDetalhando, setIsDetalhando] = useState(false);
  const [progresso, setProgresso] = useState<{ feito: number; total: number }>({
    feito: 0,
    total: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [atualizar, setAtualizar] = useState(false);
  const [isSincronizando, setIsSincronizando] = useState(false);

  // Atualiza os preços base (anúncios Shopee → nosso banco) sob demanda.
  async function sincronizarPrecos() {
    if (!token) {
      setError("Não autenticado — refaça o login.");
      return;
    }
    setIsSincronizando(true);
    try {
      const { total } = await sincronizarPrecosAnuncios(token);
      toast.success(
        `Preços base atualizados: ${total} anúncios.` +
          (recebidosConciliados ? " Clique em Buscar renda para aplicar." : ""),
      );
    } catch (err) {
      console.error("Erro ao sincronizar preços dos anúncios:", err);
      toast.error("Não foi possível atualizar os preços base.");
    } finally {
      setIsSincronizando(false);
    }
  }

  // Títulos em aberto no Tiny — base para casar e baixar (igual à v1).
  useEffect(() => {
    async function getTitulosAReceber() {
      setIsLoadingTitulos(true);
      setError(null);
      try {
        const response = await buscarTitulosAbertosV2();
        setTitulosAReceber(response.data);
        if (!response.ok) {
          setAviso(
            `Os títulos do Tiny podem estar incompletos (${response.totalColetado} carregados de ${response.totalPaginas} páginas): ${response.error}. Tente recarregar.`,
          );
        }
      } catch (err) {
        console.error("Erro ao buscar títulos do Tiny:", err);
        setError("Erro ao carregar títulos do Tiny");
      } finally {
        setIsLoadingTitulos(false);
      }
    }
    getTitulosAReceber();
  }, [atualizar]);

  // Busca a renda recebida na Shopee para o período selecionado.
  async function buscarRenda() {
    if (!token) {
      setError("Não autenticado — refaça o login.");
      return;
    }
    setIsBuscandoRenda(true);
    setError(null);
    setAviso(null);
    setDadosConciliacao(null);
    try {
      const resposta = await listarRenda(token, {
        de,
        ate,
        fluxo: "MONEY_IN",
      });
      setLancamentos(resposta.itens);
      if (resposta.itens.length === 0) {
        setAviso("Nenhuma renda recebida encontrada no período.");
      }
    } catch (err) {
      console.error("Erro ao buscar renda na Shopee:", err);
      setLancamentos(null);
      setError(
        err instanceof FinanceiroApiError
          ? err.message
          : "Erro ao buscar a renda na Shopee.",
      );
    } finally {
      setIsBuscandoRenda(false);
    }
  }

  // Concilia renda (Shopee) × títulos (Tiny). As taxas são calculadas em
  // `recebidosConciliados` (useMemo), com a tabela "Taxas Shopee" vigente.
  useEffect(() => {
    if (!lancamentos || !tituloAReceber) {
      setDadosConciliacao(null);
      return;
    }

    let cancelado = false;

    async function conciliar(
      itens: LancamentoRenda[],
      titulos: TitulosReceberApiTiny[],
    ) {
      // 1) Uma linha por pedido (order_sn), somando as entradas.
      const grupos = agrupaPorPedido(itens);

      // 2) Casa cada pedido com o título do Tiny (pelo histórico).
      const pares: Omit<ParConciliado, "detalhe">[] = [];
      const idsUsados = new Set<string>();
      for (const grupo of grupos) {
        const titulo = titulos.find(
          (t) =>
            t.conta.historico?.includes(grupo.pedido) &&
            !idsUsados.has(t.conta.id),
        );
        if (titulo) {
          pares.push({ grupo, titulo });
          idsUsados.add(titulo.conta.id);
        }
      }

      if (pares.length === 0) {
        if (!cancelado) {
          setDadosConciliacao({ pares: [], precosRef: new Map() });
        }
        return;
      }

      // 3) Detalhe financeiro de cada pedido (Shopee) + preços de referência
      //    (nosso banco), em PARALELO — o preço fica escondido atrás da janela
      //    das chamadas de detalhe.
      setIsDetalhando(true);
      setProgresso({ feito: 0, total: pares.length });
      const [{ detalhes, falhas }, precosRef] = await Promise.all([
        detalharVariosPedidos(
          token,
          pares.map((p) => p.grupo.pedido),
          {
            onProgress: (feito, total) => {
              if (!cancelado) setProgresso({ feito, total });
            },
          },
        ),
        listarPrecosAnuncios(token)
          .then((resp) => {
            const mapa = new Map<string, number>();
            for (const p of resp.itens) {
              const preco = p.precoAtual ?? p.precoOriginal;
              if (p.sku && preco != null) {
                mapa.set(p.sku.trim().toUpperCase(), preco);
              }
            }
            return mapa;
          })
          .catch((err) => {
            console.error("Erro ao carregar preços de referência:", err);
            return new Map<string, number>();
          }),
      ]);
      if (cancelado) return;
      setIsDetalhando(false);

      if (falhas.length > 0) {
        setAviso(
          `${falhas.length} pedido(s) não tiveram o detalhe carregado na Shopee — a base desses caiu no valor do título.`,
        );
      }

      // 4) Guarda os dados brutos; o cálculo das taxas é feito no useMemo.
      setDadosConciliacao({
        pares: pares.map((p) => ({
          ...p,
          detalhe: detalhes.get(p.grupo.pedido),
        })),
        precosRef,
      });
    }

    conciliar(lancamentos, tituloAReceber).catch((err) => {
      console.error("Erro durante conciliação:", err);
      if (!cancelado) {
        setIsDetalhando(false);
        setError("Erro durante o processo de conciliação");
      }
    });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lancamentos, tituloAReceber]);

  async function handleSalvarTaxas(faixas: FaixaComissao[]) {
    await salvarTaxas(faixas);
    toast.success(
      "Taxas da Shopee salvas." +
        (recebidosConciliados ? " Valores da lista recalculados." : ""),
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">
          Conciliação de Títulos E-commerce | Shopee
        </h1>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40">
          V2 · API Shopee
        </span>
        <button
          type="button"
          onClick={() => setModalTaxasAberto(true)}
          title="Comissão e taxa fixa da Shopee por faixa de preço"
          className="ml-auto flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
        >
          <Percent className="h-4 w-4" />
          Taxas Shopee
        </button>
        <button
          type="button"
          onClick={sincronizarPrecos}
          disabled={isSincronizando}
          title="Atualiza os preços base (anúncios Shopee → nosso banco)"
          className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isSincronizando ? "animate-spin" : ""}`}
          />
          {isSincronizando ? "Atualizando..." : "Atualizar preços base"}
        </button>
      </div>

      <PeriodoRendaForm
        de={de}
        ate={ate}
        setDe={setDe}
        setAte={setAte}
        onBuscar={buscarRenda}
        carregando={isBuscandoRenda}
      />

      {error && (
        <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <strong>Erro:</strong> {error}
        </div>
      )}

      {erroTaxas && (
        <div className="mt-2 rounded border border-yellow-400 bg-yellow-100 p-3 text-yellow-800">
          Não foi possível carregar as taxas salvas ({erroTaxas}). Os valores
          estão sendo calculados com a tabela padrão.
        </div>
      )}

      {aviso && (
        <div className="mt-2 rounded border border-yellow-400 bg-yellow-100 p-3 text-yellow-800">
          {aviso}
        </div>
      )}

      {(lancamentos || tituloAReceber) && (
        <div className="mt-2 flex flex-wrap gap-4 rounded-lg border border-slate-200 bg-white/70 px-4 py-2 text-xs text-slate-600">
          <span>
            Títulos abertos (Tiny):{" "}
            <strong className="text-slate-800">
              {tituloAReceber ? tituloAReceber.length : "carregando..."}
            </strong>
          </span>
          <span>
            Renda (Shopee):{" "}
            <strong className="text-slate-800">
              {lancamentos ? lancamentos.length : "—"}
            </strong>{" "}
            lançamentos
          </span>
          <span>
            Pedidos únicos:{" "}
            <strong className="text-slate-800">
              {lancamentos ? agrupaPorPedido(lancamentos).length : "—"}
            </strong>
          </span>
        </div>
      )}

      {isLoadingTitulos && (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Carregando títulos...</span>
        </div>
      )}

      {isDetalhando && (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-500"></div>
          <span className="ml-2 text-gray-600">
            Buscando preço base na Shopee... ({progresso.feito}/
            {progresso.total})
          </span>
        </div>
      )}

      {recebidosConciliados && recebidosConciliados.length > 0 && (
        <div className="mt-6">
          {lancamentos && tituloAReceber && (
            <div className="mb-6 mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="mb-2 font-semibold text-blue-800">Resumo:</h3>
              <p className="text-blue-700">
                <strong>Renda Shopee:</strong> {lancamentos.length} lançamentos |
                <strong> Títulos em aberto Tiny:</strong>{" "}
                {tituloAReceber.length} itens |<strong> Conciliados:</strong>{" "}
                {recebidosConciliados.length} itens
              </p>
            </div>
          )}
          <TituloLista
            atualizar={atualizar}
            setAtualizar={setAtualizar}
            recebidosConciliados={recebidosConciliados}
            baseLabel="Preço Base"
            baseSublabel="Referência"
          />
        </div>
      )}

      {recebidosConciliados && recebidosConciliados.length === 0 && (
        <div className="mt-6 rounded border border-yellow-400 bg-yellow-100 p-4 text-yellow-700">
          <p>Nenhum título foi encontrado para conciliação. Verifique se:</p>
          <ul className="mt-2 list-inside list-disc">
            <li>Há renda recebida no período selecionado</li>
            <li>
              Os números de pedido da Shopee estão no histórico dos títulos do
              Tiny
            </li>
          </ul>
        </div>
      )}

      <ModalTaxasShopee
        aberto={modalTaxasAberto}
        onFechar={() => setModalTaxasAberto(false)}
        taxas={taxas}
        onSalvar={handleSalvarTaxas}
      />
    </div>
  );
}
