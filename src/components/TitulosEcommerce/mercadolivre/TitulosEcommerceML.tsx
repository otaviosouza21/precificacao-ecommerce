"use client";

import { useEffect, useMemo, useState } from "react";
import { FileWarning, Info, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { buscarTitulosAbertosV2 } from "@/actions/buscarTitulosAbertosV2";
import { buscarPedidosML, type PedidoML } from "@/actions/buscarPedidosML";
import type { TitulosReceberApiTiny } from "@/api/types/api-types";
import LerPlanilhaML from "./LerPlanilhaML";
import TituloListaML from "./TituloListaML";
import ListaConferenciaML from "./ListaConferenciaML";
import type { RecebimentoML } from "./parseReserveML";
import {
  agrupaTitulosPorPedido,
  conciliaML,
  conferenciaML,
  separaPorPresenca,
  INICIO_GERACAO_TITULOS,
} from "./conciliaML";
import { formatCurrency, formatDate } from "../functions/formataDados";

type FiltroConf = "todos" | "confere" | "atencao" | "estornado";

export default function TitulosEcommerceML() {
  const [recebimentos, setRecebimentos] = useState<RecebimentoML[] | null>(null);
  const [periodo, setPeriodo] = useState<{ de: string; ate: string } | null>(
    null,
  );
  const [avisos, setAvisos] = useState<string[]>([]);

  const [pedidos, setPedidos] = useState<Record<string, PedidoML> | null>(null);
  const [pedidosCompletos, setPedidosCompletos] = useState(true);
  const [titulos, setTitulos] = useState<TitulosReceberApiTiny[] | null>(null);

  const [carregandoPedidos, setCarregandoPedidos] = useState(false);
  const [carregandoTitulos, setCarregandoTitulos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recarregar, setRecarregar] = useState(0);
  const [filtro, setFiltro] = useState<FiltroConf>("todos");

  // Títulos agora são buscados SEMPRE que há arquivo: é a presença deles que
  // decide o regime de cada operação, então não dá para condicionar a busca.
  useEffect(() => {
    if (!recebimentos || recebimentos.length === 0) {
      setTitulos(null);
      return;
    }
    let cancelado = false;

    (async () => {
      setCarregandoTitulos(true);
      setErro(null);
      try {
        const r = await buscarTitulosAbertosV2();
        if (cancelado) return;
        setTitulos(r.data);
        if (!r.ok && r.error) {
          setErro(`Carregamento parcial dos títulos: ${r.error}`);
        }
      } catch (e) {
        if (!cancelado) {
          setErro(
            e instanceof Error ? e.message : "Erro ao carregar títulos do Tiny",
          );
        }
      } finally {
        if (!cancelado) setCarregandoTitulos(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [recebimentos, recarregar]);

  const mapaTitulos = useMemo(
    () => (titulos ? agrupaTitulosPorPedido(titulos) : null),
    [titulos],
  );

  const modos = useMemo(
    () =>
      recebimentos && mapaTitulos
        ? separaPorPresenca(recebimentos, mapaTitulos)
        : null,
    [recebimentos, mapaTitulos],
  );

  // Conferência precisa dos PEDIDOS do Tiny — a contraparte quando não há título.
  useEffect(() => {
    if (!modos || modos.conferencia.length === 0 || !periodo) {
      setPedidos(null);
      return;
    }
    let cancelado = false;

    (async () => {
      setCarregandoPedidos(true);
      try {
        const r = await buscarPedidosML({
          dataInicio: periodo.de,
          dataFim: periodo.ate,
          forcar: recarregar > 0,
        });
        if (cancelado) return;
        setPedidos(r.porPedido);
        setPedidosCompletos(r.ok);
        if (!r.ok && r.error) {
          setErro(
            `A busca de pedidos no Tiny não terminou (${r.error}). As operações ` +
              `sem pedido aparecem como "Não verificado" — recarregue antes de concluir.`,
          );
        }
      } catch (e) {
        if (!cancelado) {
          setErro(
            e instanceof Error ? e.message : "Erro ao buscar pedidos do Tiny",
          );
        }
      } finally {
        if (!cancelado) setCarregandoPedidos(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [modos, periodo, recarregar]);

  const conferencia = useMemo(() => {
    if (!modos || modos.conferencia.length === 0 || !pedidos) return null;
    return conferenciaML(modos.conferencia, pedidos, { pedidosCompletos });
  }, [modos, pedidos, pedidosCompletos]);

  const operacional = useMemo(() => {
    if (!modos || modos.titulo.length === 0 || !titulos) return null;
    return conciliaML(modos.titulo, titulos);
  }, [modos, titulos]);

  const itensConf = useMemo(() => {
    if (!conferencia) return [];
    const { itens } = conferencia;
    if (filtro === "confere") return itens.filter((i) => i.status === "confere");
    if (filtro === "estornado")
      return itens.filter((i) => i.status === "estornado");
    if (filtro === "atencao")
      return itens.filter(
        (i) =>
          i.status === "divergente" ||
          i.status === "sem_pedido" ||
          i.status === "titulo_faltando" ||
          i.status === "nao_verificado",
      );
    return itens;
  }, [conferencia, filtro]);

  const totaisConf = useMemo(() => {
    if (!conferencia) return null;
    const i = conferencia.itens;
    const ativos = i.filter((x) => x.status !== "estornado");
    return {
      total: i.length,
      confere: i.filter((x) => x.status === "confere").length,
      atencao: i.filter(
        (x) =>
          x.status === "divergente" ||
          x.status === "sem_pedido" ||
          x.status === "titulo_faltando" ||
          x.status === "nao_verificado",
      ).length,
      tituloFaltando: i.filter((x) => x.status === "titulo_faltando").length,
      estornado: i.filter((x) => x.status === "estornado").length,
      bruto: ativos.reduce((a, x) => a + x.recebimento.valor_bruto, 0),
      taxas: ativos.reduce((a, x) => a + x.valor_taxas, 0),
      recebido: ativos.reduce((a, x) => a + x.valor_recebido, 0),
    };
  }, [conferencia]);

  /** Títulos abertos de vendas que o Mercado Livre estornou: nunca serão pagos. */
  const estornadosComTitulo = useMemo(() => {
    if (!operacional) return null;
    const lista = operacional.conciliados.filter(
      (c) => c.status === "estornado",
    );
    if (lista.length === 0) return null;
    return {
      pedidos: lista.length,
      titulos: lista.reduce((a, c) => a + c.titulos.length, 0),
      valor: lista.reduce((a, c) => a + c.valor_titulos, 0),
    };
  }, [operacional]);

  const carregando = carregandoPedidos || carregandoTitulos;

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl text-white font-bold">
          Conciliação de Títulos E-commerce | Mercado Livre
        </h1>
        {recebimentos && (
          <button
            onClick={() => setRecarregar((v) => v + 1)}
            disabled={carregando}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`}
            />
            Recarregar dados do Tiny
          </button>
        )}
      </div>

      {erro && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
          <strong>Erro:</strong> {erro}
        </div>
      )}

      <LerPlanilhaML
        setRecebimentos={(r) => {
          setRecebimentos(r);
          if (r === null) {
            setPedidos(null);
            setTitulos(null);
            setErro(null);
          }
        }}
        setPeriodo={setPeriodo}
        setAvisos={setAvisos}
      />

      {avisos.map((a) => (
        <div
          key={a}
          className="flex gap-2 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-xl mb-3 text-sm"
        >
          <FileWarning className="h-5 w-5 shrink-0" />
          <span>{a}</span>
        </div>
      ))}

      {carregando && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          <span className="ml-2 text-slate-300">
            {carregandoTitulos
              ? "Carregando títulos do Tiny..."
              : "Buscando pedidos do Mercado Livre no Tiny..."}
          </span>
        </div>
      )}

      {modos && (
        <div className="flex gap-2 bg-slate-800/60 border border-slate-600 text-slate-200 px-4 py-2.5 rounded-xl mb-5 text-sm">
          <Info className="h-5 w-5 shrink-0 text-slate-400" />
          <span>
            {modos.titulo.length + modos.conferencia.length} operações no
            arquivo: <strong>{modos.titulo.length}</strong> com título no Tiny
            (conciliação) e <strong>{modos.conferencia.length}</strong> sem
            título (conferência). O Tiny começou a gerar títulos de Mercado Livre
            em {formatDate(INICIO_GERACAO_TITULOS)}; vendas anteriores a isso não
            têm conta a receber.
          </span>
        </div>
      )}

      {/* ---------------------- COM TÍTULO: CONCILIAÇÃO ---------------------- */}
      {modos && modos.titulo.length > 0 && (
        <section className="mb-10">
          <div className="flex gap-3 bg-emerald-900/30 border border-emerald-400 text-emerald-50 px-4 py-3 rounded-xl mb-4">
            <Info className="h-5 w-5 shrink-0 text-emerald-300" />
            <div className="text-sm">
              <p className="font-semibold">
                Conciliação — {modos.titulo.length} operações com título no Tiny
              </p>
              <p className="mt-0.5">
                O recebimento é conferido contra as contas a receber do pedido,
                somando todas as parcelas. Só pedido com status{" "}
                <strong>Confere</strong> pode ser baixado; quando há parcelas,
                todas são baixadas juntas na data da liberação.
              </p>
            </div>
          </div>

          {estornadosComTitulo && (
            <div className="flex gap-3 bg-rose-900/30 border border-rose-400 text-rose-50 px-4 py-3 rounded-xl mb-4">
              <ShieldAlert className="h-5 w-5 shrink-0 text-rose-300" />
              <div className="text-sm">
                <p className="font-semibold">
                  {estornadosComTitulo.titulos} títulos em aberto de vendas
                  estornadas — {formatCurrency(estornadosComTitulo.valor)}
                </p>
                <p className="mt-0.5">
                  Em {estornadosComTitulo.pedidos} pedidos o dinheiro entrou e
                  saiu no Mercado Livre, mas a conta a receber segue aberta no
                  Tiny. Esses valores nunca serão recebidos.
                </p>
              </div>
            </div>
          )}

          {operacional && (
            <TituloListaML
              itens={operacional.conciliados}
              onBaixado={() => setRecarregar((v) => v + 1)}
            />
          )}
        </section>
      )}

      {/* ---------------------- SEM TÍTULO: CONFERÊNCIA ---------------------- */}
      {modos && modos.conferencia.length > 0 && (
        <section>
          <div className="flex gap-3 bg-sky-900/40 border-2 border-sky-400 text-sky-50 px-4 py-3 rounded-xl mb-4">
            <ShieldAlert className="h-6 w-6 shrink-0 text-sky-300" />
            <div className="text-sm">
              <p className="font-bold text-base">
                Conferência — {modos.conferencia.length} recebimentos sem título
                no Tiny
              </p>
              <p className="mt-0.5">
                Estes recebimentos <strong>não têm conta a receber</strong> e{" "}
                <strong>não geram baixa</strong>. São vendas anteriores a{" "}
                {formatDate(INICIO_GERACAO_TITULOS)}, quando a integração
                financeira do Mercado Livre ainda estava desligada. Aqui o
                recebimento é conferido contra o <strong>pedido</strong>.
              </p>
            </div>
          </div>

          {totaisConf && totaisConf.tituloFaltando > 0 && (
            <div className="flex gap-3 bg-purple-900/30 border border-purple-400 text-purple-50 px-4 py-3 rounded-xl mb-4">
              <ShieldAlert className="h-5 w-5 shrink-0 text-purple-300" />
              <div className="text-sm">
                <p className="font-semibold">
                  {totaisConf.tituloFaltando} vendas posteriores a{" "}
                  {formatDate(INICIO_GERACAO_TITULOS)} chegaram sem conta a
                  receber
                </p>
                <p className="mt-0.5">
                  O pedido existe no Tiny e os valores batem, mas a integração
                  não gerou o financeiro. Costuma ser pedido ainda sem nota
                  fiscal emitida — vale conferir no ERP.
                </p>
              </div>
            </div>
          )}

          {totaisConf && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
                <Cartao
                  titulo="Operações conferidas"
                  valor={String(totaisConf.total)}
                  detalhe={`${totaisConf.confere} conferem · ${totaisConf.atencao} com atenção`}
                />
                <Cartao
                  titulo="Bruto no Mercado Livre"
                  valor={formatCurrency(totaisConf.bruto)}
                  detalhe="exclui estornados"
                />
                <Cartao
                  titulo="Taxas retidas"
                  valor={formatCurrency(totaisConf.taxas)}
                  detalhe={
                    totaisConf.bruto
                      ? `${((100 * totaisConf.taxas) / totaisConf.bruto).toFixed(1)}% do bruto`
                      : ""
                  }
                  destaque="text-red-600"
                />
                <Cartao
                  titulo="Recebido"
                  valor={formatCurrency(totaisConf.recebido)}
                  detalhe="líquido creditado"
                  destaque="text-emerald-600"
                />
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <Aba
                  ativo={filtro === "todos"}
                  onClick={() => setFiltro("todos")}
                  label="Todos"
                  n={totaisConf.total}
                />
                <Aba
                  ativo={filtro === "confere"}
                  onClick={() => setFiltro("confere")}
                  label="Conferem"
                  n={totaisConf.confere}
                />
                <Aba
                  ativo={filtro === "atencao"}
                  onClick={() => setFiltro("atencao")}
                  label="Precisam de atenção"
                  n={totaisConf.atencao}
                />
                <Aba
                  ativo={filtro === "estornado"}
                  onClick={() => setFiltro("estornado")}
                  label="Estornados"
                  n={totaisConf.estornado}
                />
              </div>

              <ListaConferenciaML itens={itensConf} />

              {conferencia && conferencia.semRecebimento.length > 0 && (
                <Secao
                  titulo={`Pedidos sem recebimento no relatório (${conferencia.semRecebimento.length})`}
                  descricao="Pedidos de Mercado Livre no período cujo dinheiro foi liberado fora da janela deste arquivo."
                >
                  <ul className="divide-y divide-slate-100">
                    {conferencia.semRecebimento.slice(0, 50).map((s) => (
                      <li
                        key={s.pedido}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="font-medium text-slate-800">
                          {s.pedido}
                        </span>
                        <span className="text-slate-500 text-xs">
                          pedido {s.pedidoTiny.numero} · {s.pedidoTiny.situacao}
                        </span>
                        <span className="text-slate-600">
                          {formatCurrency(s.pedidoTiny.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {conferencia.semRecebimento.length > 50 && (
                    <p className="text-xs text-slate-500 pt-2">
                      ...e mais {conferencia.semRecebimento.length - 50}.
                    </p>
                  )}
                </Secao>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Cartao({
  titulo,
  valor,
  detalhe,
  destaque = "text-slate-900",
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  destaque?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {titulo}
      </p>
      <p className={`text-xl font-bold mt-1 ${destaque}`}>{valor}</p>
      {detalhe && <p className="text-xs text-slate-400 mt-0.5">{detalhe}</p>}
    </div>
  );
}

function Aba({
  ativo,
  onClick,
  label,
  n,
}: {
  ativo: boolean;
  onClick: () => void;
  label: string;
  n: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        ativo
          ? "bg-amber-500 text-white shadow-sm"
          : "bg-white/80 text-slate-700 hover:bg-white"
      }`}
    >
      {label}
      <span
        className={`ml-2 text-xs ${ativo ? "text-amber-50" : "text-slate-400"}`}
      >
        {n}
      </span>
    </button>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mt-5">
      <h3 className="font-semibold text-slate-800">{titulo}</h3>
      <p className="text-xs text-slate-500 mb-2">{descricao}</p>
      {children}
    </div>
  );
}
