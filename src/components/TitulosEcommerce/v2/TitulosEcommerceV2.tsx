"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buscarTitulosAbertosV2 } from "@/actions/buscarTitulosAbertosV2";
import { TitulosReceberApiTiny } from "@/api/types/api-types";
import {
  detalharVariosPedidos,
  FinanceiroApiError,
  listarRenda,
  type ComposicaoRenda,
  type LancamentoRenda,
} from "@/lib/financeiro";
import { calculaTaxas } from "../functions/formataDados";
import TituloLista from "../TitulosLista/TituloLista";
import { ConciliacaoItem } from "../TitulosEcommerce";
import PeriodoRendaForm from "./PeriodoRendaForm";

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
// Preço base (= preço de venda do anúncio na Shopee, já com o desconto)
// ---------------------------------------------------------------------------

// Base = preço de venda (com desconto) do pedido na Shopee — equivale ao
// price_info.current_price do anúncio. Usa o valor a nível de PEDIDO
// (order_selling_price), que é o total correto da venda; somar
// items[].selling_price × qtd super-conta em kits/itens com quantidade.
function baseSellingDosItens(comp: ComposicaoRenda | undefined): number | null {
  if (!comp) return null;

  if (typeof comp.order_selling_price === "number")
    return comp.order_selling_price;
  if (typeof comp.order_discounted_price === "number")
    return comp.order_discounted_price;

  // Fallback: soma dos itens (só quando não há total a nível de pedido).
  const itens = Array.isArray(comp.items) ? comp.items : [];
  let soma = 0;
  let algum = false;
  for (const it of itens) {
    const preco = typeof it.selling_price === "number" ? it.selling_price : null;
    if (preco == null) continue;
    const qtd =
      typeof it.quantity_purchased === "number" && it.quantity_purchased > 0
        ? it.quantity_purchased
        : 1;
    soma += preco * qtd;
    algum = true;
  }
  return algum ? +soma.toFixed(2) : null;
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

export default function TitulosEcommerceV2() {
  const { token } = useAuth();

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
  const [recebidosConciliados, setRecebidosConciliados] = useState<
    ConciliacaoItem[] | null
  >(null);

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
    setRecebidosConciliados(null);
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

  // Concilia renda (Shopee) × títulos (Tiny) e calcula as taxas.
  useEffect(() => {
    if (!lancamentos || !tituloAReceber) {
      setRecebidosConciliados(null);
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
      const pares: {
        grupo: GrupoRenda;
        titulo: TitulosReceberApiTiny;
      }[] = [];
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
        if (!cancelado) setRecebidosConciliados([]);
        return;
      }

      // 3) Detalhe financeiro de cada pedido (preço base vem da Shopee, não
      //    mais do Tiny). Concorrência limitada + progresso.
      setIsDetalhando(true);
      setProgresso({ feito: 0, total: pares.length });
      const { detalhes, falhas } = await detalharVariosPedidos(
        token,
        pares.map((p) => p.grupo.pedido),
        {
          onProgress: (feito, total) => {
            if (!cancelado) setProgresso({ feito, total });
          },
        },
      );
      if (cancelado) return;
      setIsDetalhando(false);

      if (falhas.length > 0) {
        setAviso(
          `${falhas.length} pedido(s) não tiveram o detalhe carregado na Shopee — a base desses caiu no valor do título.`,
        );
      }

      // 4) Monta a conciliação no mesmo formato da v1.
      const conciliados: ConciliacaoItem[] = pares.map(({ grupo, titulo }) => {
        const detalhe = detalhes.get(grupo.pedido);

        // Base de cálculo = preço de venda (com desconto) do pedido na Shopee.
        // Sem detalhe, cai no valor do título do Tiny.
        const precoBase = baseSellingDosItens(detalhe?.composicao);
        const valorBase = precoBase ?? +titulo.conta.valor;

        // Comissão de afiliados (order_ams_commission_fee) entra como dedução
        // extra. O calculaTaxas faz `taxa = comissão - taxa_afiliados`, então
        // passamos NEGATIVO para que reduza o líquido corretamente.
        const afiliados =
          typeof detalhe?.composicao?.order_ams_commission_fee === "number"
            ? detalhe.composicao.order_ams_commission_fee
            : 0;
        const taxaAfiliados = -Math.abs(afiliados);

        const taxas = calculaTaxas({
          planilha: {
            id_ecommerce: grupo.pedido,
            sku: "",
            nome_anuncio: grupo.pedido,
            dt_criacao_pedido: dataCriacaoDoPedido(
              grupo.pedido,
              grupo.dataRecebimento,
            ),
            dt_conclusao: isoParaDataBR(grupo.dataRecebimento),
            valor_recebido: String(grupo.valorRecebido),
            preco_com_rebate: +valorBase.toFixed(2),
            cupom_rebate: 0,
            taxa_afiliados: taxaAfiliados,
            subisidio_pix: 0,
          },
          tituloRelacionado: titulo,
          precoBase,
        });

        return {
          id_ecommerce: grupo.pedido,
          sku: "",
          preco_base: +valorBase.toFixed(2),
          descricao_anuncio: detalhe?.cliente || grupo.cliente || grupo.pedido,
          dt_criacao_pedido: dataCriacaoDoPedido(
            grupo.pedido,
            grupo.dataRecebimento,
          ),
          valor_recebido: +grupo.valorRecebido.toFixed(2),
          valor_titulo: +titulo.conta.valor,
          subisidio_pix: 0,
          valor_calculado: +taxas.valorCalculado.toFixed(2),
          valor_taxas: +taxas.valorTaxa.toFixed(2),
          preco_com_rebate: +valorBase.toFixed(2),
          valor_rebate: 0,
          cupom_rebate: 0,
          historico: titulo.conta.historico,
          cliente: titulo.conta.nome_cliente || grupo.cliente,
          data_recebimento: isoParaDataBR(grupo.dataRecebimento),
          documento: titulo.conta.numero_doc,
          id: titulo.conta.id,
          regra: taxas.regra,
          taxa_afiliados: taxaAfiliados,
          houveArredondamento: taxas.houveArredondamento,
        };
      });

      if (!cancelado) setRecebidosConciliados(conciliados);
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

  return (
    <div className="p-4">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-white">
          Conciliação de Títulos E-commerce | Shopee
        </h1>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/40">
          V2 · API Shopee
        </span>
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
            baseSublabel="Shopee"
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
    </div>
  );
}
