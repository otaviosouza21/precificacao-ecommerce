"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Inbox,
  Layers,
  Plus,
  Square,
} from "lucide-react";
import { toast } from "react-toastify";
import { baixarTituloTiny } from "@/actions/baixaTituloTiny";
import BaixaButton from "@/components/Ui/Forms/BaixaButton";
import { CopyButton } from "@/components/Ui/CopyButton";
import { formatCurrency, formatDate } from "../functions/formataDados";
import ComposicaoRecebimento from "./ComposicaoRecebimento";
import type { ConciliacaoML, StatusConciliacao } from "./conciliaML";
import { taxaEfetiva } from "./conciliaML";
import {
  montaPayloadsBaixaML,
  motivoBloqueio,
  podeBaixar,
  validaRateio,
} from "./baixaML";

const BADGE: Record<
  StatusConciliacao,
  { label: string; classe: string; icone: typeof Check }
> = {
  ok: {
    label: "Confere",
    classe: "bg-green-100 text-green-800 ring-1 ring-green-600/20",
    icone: Check,
  },
  divergente: {
    label: "Divergente",
    classe: "bg-amber-100 text-amber-800 ring-1 ring-amber-600/20",
    icone: AlertTriangle,
  },
  estornado: {
    label: "Estornado",
    classe: "bg-slate-200 text-slate-700 ring-1 ring-slate-500/20",
    icone: Ban,
  },
  parcelas_faltando: {
    label: "Parcelas faltando",
    classe: "bg-orange-100 text-orange-800 ring-1 ring-orange-600/20",
    icone: Layers,
  },
};

type Props = {
  itens: ConciliacaoML[];
  /** Dispara o recarregamento dos títulos depois de uma baixa. */
  onBaixado?: () => void;
};

export default function TituloListaML({ itens, onBaixado }: Props) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [emLote, setEmLote] = useState(false);
  const [processando, setProcessando] = useState<Set<string>>(new Set());

  /** Só pedido conferido entra na seleção — divergente e estornado nunca. */
  const baixaveis = useMemo(() => itens.filter(podeBaixar), [itens]);

  const baixaPedido = useCallback(
    async (item: ConciliacaoML): Promise<boolean> => {
      const bloqueio = motivoBloqueio(item);
      if (bloqueio) {
        toast.error(bloqueio);
        return false;
      }
      const erroRateio = validaRateio(item);
      if (erroRateio) {
        toast.error(erroRateio);
        return false;
      }

      // Todas as parcelas do pedido são baixadas juntas, na data da liberação:
      // o Mercado Livre depositou o valor inteiro de uma vez.
      const payloads = montaPayloadsBaixaML(item);
      let ok = 0;
      for (const p of payloads) {
        try {
          const r = await baixarTituloTiny(p);
          if (r.success) ok++;
          else toast.error(`${item.pedido}: ${r.message}`);
        } catch {
          toast.error(`${item.pedido}: falha na requisição`);
        }
      }

      if (ok === payloads.length) return true;
      if (ok > 0) {
        toast.warning(
          `${item.pedido}: ${ok} de ${payloads.length} parcelas baixadas. Confira o pedido no Tiny.`,
        );
      }
      return false;
    },
    [],
  );

  const handleBaixarUm = useCallback(
    async (item: ConciliacaoML) => {
      setProcessando((p) => new Set(p).add(item.pedido));
      const ok = await baixaPedido(item);
      setProcessando((p) => {
        const n = new Set(p);
        n.delete(item.pedido);
        return n;
      });
      if (ok) {
        toast.success(
          `Pedido ${item.pedido} baixado (${item.titulos.length} ${
            item.titulos.length > 1 ? "parcelas" : "título"
          }).`,
        );
        onBaixado?.();
      }
    },
    [baixaPedido, onBaixado],
  );

  const handleBaixarSelecionados = useCallback(async () => {
    if (selecionados.size === 0) {
      toast.warning("Selecione pelo menos um pedido");
      return;
    }
    setEmLote(true);

    let sucessos = 0;
    let erros = 0;
    // A validação roda item a item também no lote — a tela da Shopee não faz
    // isso e permite baixar divergente em massa; aqui não.
    for (const item of itens) {
      if (!selecionados.has(item.pedido)) continue;
      const ok = await baixaPedido(item);
      if (ok) sucessos++;
      else erros++;
    }

    setEmLote(false);
    setSelecionados(new Set());

    if (sucessos > 0) {
      toast.success(`${sucessos} pedido(s) baixado(s) com sucesso`);
      onBaixado?.();
    }
    if (erros > 0) toast.error(`${erros} pedido(s) não foram baixados`);
  }, [itens, selecionados, baixaPedido, onBaixado]);

  const alternaSelecao = useCallback((pedido: string) => {
    setSelecionados((p) => {
      const n = new Set(p);
      if (n.has(pedido)) n.delete(pedido);
      else n.add(pedido);
      return n;
    });
  }, []);

  const alternaTodos = useCallback(() => {
    setSelecionados((p) =>
      p.size === baixaveis.length
        ? new Set()
        : new Set(baixaveis.map((i) => i.pedido)),
    );
  }, [baixaveis]);

  const totalSelecionado = useMemo(
    () =>
      itens
        .filter((i) => selecionados.has(i.pedido))
        .reduce((a, i) => a + i.valor_recebido, 0),
    [itens, selecionados],
  );

  if (itens.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center py-12">
        <Inbox className="h-10 w-10 text-slate-300 mb-3" />
        <h3 className="text-sm font-medium text-slate-900">
          Nenhum pedido com título para conciliar
        </h3>
      </div>
    );
  }

  const todosSelecionados =
    selecionados.size === baixaveis.length && baixaveis.length > 0;

  return (
    <div className="space-y-4 w-full">
      {/* Barra de ações em lote — mesmo padrão da tela da Shopee */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={alternaTodos}
            disabled={baixaveis.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:text-slate-900 hover:bg-white/70 disabled:opacity-40 transition-colors"
          >
            {todosSelecionados ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {todosSelecionados ? "Desmarcar todos" : "Selecionar conferidos"}
          </button>

          <span className="text-sm text-slate-600">
            {baixaveis.length} de {itens.length} podem ser baixados
            {selecionados.size > 0 && (
              <>
                {" · "}
                <strong>{selecionados.size} selecionados</strong> (
                {formatCurrency(totalSelecionado)})
              </>
            )}
          </span>
        </div>

        {selecionados.size > 0 && (
          <button
            onClick={handleBaixarSelecionados}
            disabled={emLote}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-all shadow-sm disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {emLote
              ? "Processando..."
              : `Baixar ${selecionados.size} pedido(s)`}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto rounded-xl">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
              <tr>
                <th className="px-4 py-4 w-8">
                  <span className="sr-only">Seleção</span>
                </th>
                <th className="px-3 py-4 w-8">
                  <span className="sr-only">Expandir</span>
                </th>
                <th className="px-4 py-4 text-left">
                  <span className="sr-only">Ações</span>
                </th>
                <Th>Pedido ML</Th>
                <Th>Cliente</Th>
                <Th>Status</Th>
                <Th right sub="Tiny" subCor="text-blue-500">
                  Títulos
                </Th>
                <Th right sub="ML" subCor="text-amber-500">
                  Bruto
                </Th>
                <Th right>Taxas</Th>
                <Th right>Taxa&nbsp;%</Th>
                <Th right sub="ML" subCor="text-emerald-600">
                  Recebido
                </Th>
                <Th>Liberação</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {itens.map((item) => (
                <Linha
                  key={item.pedido}
                  item={item}
                  selecionado={selecionados.has(item.pedido)}
                  processando={processando.has(item.pedido)}
                  onSelecionar={alternaSelecao}
                  onBaixar={handleBaixarUm}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  right,
  sub,
  subCor,
}: {
  children?: React.ReactNode;
  right?: boolean;
  sub?: string;
  subCor?: string;
}) {
  return (
    <th
      className={`px-4 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider ${
        right ? "text-right" : "text-left"
      }`}
    >
      {sub ? (
        <div className={`flex flex-col ${right ? "items-end" : ""}`}>
          <span>{children}</span>
          <span className={`${subCor} font-bold text-xs`}>{sub}</span>
        </div>
      ) : (
        children
      )}
    </th>
  );
}

const Linha = memo(function Linha({
  item,
  selecionado,
  processando,
  onSelecionar,
  onBaixar,
}: {
  item: ConciliacaoML;
  selecionado: boolean;
  processando: boolean;
  onSelecionar: (pedido: string) => void;
  onBaixar: (item: ConciliacaoML) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const badge = BADGE[item.status];
  const Icone = badge.icone;
  const rec = item.recebimento;
  const parcelado = item.titulos.length > 1;
  const liberavel = podeBaixar(item);
  const bloqueio = motivoBloqueio(item);

  return (
    <>
      <tr
        className={`transition-colors ${
          selecionado ? "bg-blue-50 ring-2 ring-blue-200 ring-inset" : ""
        } ${item.status === "estornado" ? "opacity-60" : "hover:bg-amber-50/60"}`}
      >
        <td className="px-4 py-4">
          <button
            onClick={() => onSelecionar(item.pedido)}
            disabled={!liberavel}
            className="p-0 disabled:opacity-30 disabled:cursor-not-allowed"
            title={bloqueio ?? "Selecionar para baixa"}
            aria-label="Selecionar pedido"
          >
            {selecionado ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-slate-400" />
            )}
          </button>
        </td>

        <td className="px-3 py-4">
          <button
            onClick={() => setAberto((v) => !v)}
            aria-label="Expandir detalhes"
          >
            {aberto ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </button>
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          {liberavel ? (
            <BaixaButton
              processing={processando}
              onClick={() => onBaixar(item)}
              icon={Check}
              iconSize={12}
              textDefault={parcelado ? `Baixar ${item.titulos.length}x` : "Baixar"}
              textProcessing="Baixando..."
              className="bg-blue-700 text-white text-xs"
            />
          ) : (
            <span
              className="text-xs text-slate-400 cursor-help"
              title={bloqueio ?? undefined}
            >
              —
            </span>
          )}
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
          <div className="flex items-center gap-1">
            {item.pedido}
            <CopyButton text={item.pedido} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">
              {rec.viaPacote ? "via pacote" : "via pedido"}
            </span>
            {parcelado && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
                <Layers className="h-3 w-3" />
                {item.titulos.length} parcelas
              </span>
            )}
          </div>
        </td>

        <td className="px-4 py-4 text-sm text-slate-700 max-w-[170px] truncate">
          {item.titulos[0]?.cliente ?? ""}
        </td>

        <td className="px-4 py-4 whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.classe}`}
            title={item.observacao}
          >
            <Icone className="h-3 w-3" />
            {badge.label}
          </span>
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
          {formatCurrency(item.valor_titulos)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-slate-700">
          {formatCurrency(rec.valor_bruto)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-slate-700">
          {item.status === "estornado" ? "—" : formatCurrency(item.valor_taxas)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
          {item.status === "estornado" ? (
            <span className="text-slate-400">—</span>
          ) : (
            <TaxaPercentual valor={taxaEfetiva(item)} />
          )}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-emerald-700">
          {formatCurrency(item.valor_recebido)}
        </td>
        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
          {rec.data_liberacao ? formatDate(rec.data_liberacao) : "—"}
        </td>
      </tr>

      {aberto && (
        <tr className="bg-slate-50/80">
          <td colSpan={12} className="px-6 py-4">
            <Detalhamento item={item} />
          </td>
        </tr>
      )}
    </>
  );
});

function TaxaPercentual({ valor }: { valor: number }) {
  const alto = valor > 45;
  const baixo = valor < 15;
  return (
    <span
      className={
        alto
          ? "text-red-600 font-semibold"
          : baixo
            ? "text-amber-600 font-semibold"
            : "text-slate-700"
      }
      title={
        alto
          ? "Taxa acima do padrão — vale conferir frete e comissão"
          : baixo
            ? "Taxa abaixo do padrão — confira se o frete foi cobrado"
            : undefined
      }
    >
      {valor.toFixed(1)}%
    </span>
  );
}

function Detalhamento({ item }: { item: ConciliacaoML }) {
  // Mostra o rateio exatamente como vai para o Tiny, antes de baixar.
  const payloads = podeBaixar(item) ? montaPayloadsBaixaML(item) : null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ComposicaoRecebimento rec={item.recebimento} />

      <div>
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
          Títulos no Tiny ({item.titulos.length})
          {payloads && " · rateio da baixa"}
        </h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="text-left font-medium py-1">Documento</th>
              <th className="text-left font-medium py-1">Parcela</th>
              <th className="text-right font-medium py-1">Título</th>
              {payloads && (
                <>
                  <th className="text-right font-medium py-1">Pago</th>
                  <th className="text-right font-medium py-1">Taxas</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {item.titulos.map((t, i) => (
              <tr key={t.id} className="border-b border-slate-200/70">
                <td className="py-1.5 text-slate-700">{t.numero_doc || t.id}</td>
                <td className="py-1.5 text-slate-600">{t.parcela ?? "única"}</td>
                <td className="py-1.5 text-right font-medium text-slate-900">
                  {formatCurrency(t.valor)}
                </td>
                {payloads && (
                  <>
                    <td className="py-1.5 text-right text-emerald-700">
                      {formatCurrency(payloads[i].valorPago)}
                    </td>
                    <td className="py-1.5 text-right text-red-600">
                      {formatCurrency(payloads[i].valorTaxas ?? 0)}
                    </td>
                  </>
                )}
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="py-1.5 font-semibold text-slate-800">
                Soma
              </td>
              <td className="py-1.5 text-right font-bold text-slate-900">
                {formatCurrency(item.valor_titulos)}
              </td>
              {payloads && (
                <>
                  <td className="py-1.5 text-right font-bold text-emerald-700">
                    {formatCurrency(item.valor_recebido)}
                  </td>
                  <td className="py-1.5 text-right font-bold text-red-600">
                    {formatCurrency(item.valor_taxas)}
                  </td>
                </>
              )}
            </tr>
          </tbody>
        </table>

        {item.titulos.length > 1 && payloads && (
          <p className="mt-3 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-lg p-2">
            As {item.titulos.length} parcelas são baixadas juntas, com a data da
            liberação. O Mercado Livre depositou o valor inteiro de uma vez — se
            só a primeira fosse baixada, as outras ficariam abertas para sempre.
          </p>
        )}

        {item.observacao && (
          <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            {item.observacao}
          </p>
        )}
      </div>
    </div>
  );
}
