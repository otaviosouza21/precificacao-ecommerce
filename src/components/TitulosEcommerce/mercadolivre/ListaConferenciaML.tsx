"use client";

import { memo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Inbox,
  Loader2,
} from "lucide-react";
import { CopyButton } from "@/components/Ui/CopyButton";
import { formatCurrency, formatDate } from "../functions/formataDados";
import ComposicaoRecebimento from "./ComposicaoRecebimento";
import type { ItemConferencia, StatusConferencia } from "./conciliaML";
import { taxaEfetivaConferencia } from "./conciliaML";

/**
 * Lista da aba "Sem título no Tiny".
 *
 * Diferença essencial para `TituloListaML`: aqui a contraparte do recebimento é
 * o PEDIDO do Tiny, não o título — porque não há título em aberto para essas
 * operações (venda anterior à integração, ou título já baixado). Nenhum elemento
 * de baixa é renderizado (ausente, não desabilitado).
 */

const BADGE: Record<
  StatusConferencia,
  { label: string; classe: string; icone: typeof Check }
> = {
  confere: {
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
  sem_pedido: {
    label: "Sem pedido",
    classe: "bg-rose-100 text-rose-800 ring-1 ring-rose-600/20",
    icone: HelpCircle,
  },
  nao_verificado: {
    label: "Não verificado",
    classe: "bg-slate-100 text-slate-600 ring-1 ring-slate-400/30",
    icone: Loader2,
  },
};

export default function ListaConferenciaML({
  itens,
}: {
  itens: ItemConferencia[];
}) {
  if (itens.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center py-12">
        <Inbox className="h-10 w-10 text-slate-300 mb-3" />
        <h3 className="text-sm font-medium text-slate-900">
          Nenhuma operação nesta seleção
        </h3>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th className="px-3 py-4 w-8">
                <span className="sr-only">Expandir</span>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Pedido ML
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <div className="flex flex-col">
                  <span>Pedido</span>
                  <span className="text-blue-500 font-bold text-xs">Tiny</span>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <div className="flex flex-col items-end">
                  <span>Valor</span>
                  <span className="text-blue-500 font-bold text-xs">Tiny</span>
                </div>
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <div className="flex flex-col items-end">
                  <span>Bruto</span>
                  <span className="text-amber-500 font-bold text-xs">ML</span>
                </div>
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Taxas
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Taxa&nbsp;%
              </th>
              <th className="px-4 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <div className="flex flex-col items-end">
                  <span>Recebido</span>
                  <span className="text-emerald-600 font-bold text-xs">ML</span>
                </div>
              </th>
              <th className="px-4 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Liberação
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {itens.map((item) => (
              <LinhaConferencia key={item.pedido} item={item} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const LinhaConferencia = memo(function LinhaConferencia({
  item,
}: {
  item: ItemConferencia;
}) {
  const [aberto, setAberto] = useState(false);
  const badge = BADGE[item.status];
  const Icone = badge.icone;
  const rec = item.recebimento;

  return (
    <>
      <tr
        className={`transition-colors duration-150 hover:bg-amber-50/60 cursor-pointer ${
          item.status === "estornado" ? "opacity-60" : ""
        }`}
        onClick={() => setAberto((v) => !v)}
      >
        <td className="px-3 py-4">
          {aberto ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
          <div className="flex items-center gap-1">
            {item.pedido}
            <CopyButton text={item.pedido} />
          </div>
          <span className="text-xs text-slate-400">
            {rec.viaPacote ? "via pacote" : "via pedido"}
          </span>
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm">
          {item.pedidoTiny ? (
            <>
              <span className="font-medium text-slate-900">
                {item.pedidoTiny.numero}
              </span>
              <span className="block text-xs text-slate-500">
                {item.pedidoTiny.situacao}
              </span>
            </>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>

        <td className="px-4 py-4 text-sm text-slate-700 max-w-[170px] truncate">
          {item.pedidoTiny?.cliente ?? "—"}
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

        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-slate-700">
          {item.pedidoTiny ? formatCurrency(item.valor_pedido) : "—"}
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">
          {formatCurrency(rec.valor_bruto)}
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-slate-700">
          {item.status === "estornado" ? "—" : formatCurrency(item.valor_taxas)}
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
          {item.status === "estornado" ? (
            <span className="text-slate-400">—</span>
          ) : (
            <TaxaPercentual valor={taxaEfetivaConferencia(item)} />
          )}
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-emerald-700">
          {formatCurrency(rec.valor_recebido)}
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700">
          {rec.data_liberacao ? formatDate(rec.data_liberacao) : "—"}
        </td>
      </tr>

      {aberto && (
        <tr className="bg-slate-50/80">
          <td colSpan={11} className="px-6 py-4">
            <div className="grid gap-6 md:grid-cols-2">
              <ComposicaoRecebimento rec={rec} />
              <div>
                <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Pedido no Tiny
                </h4>
                {item.pedidoTiny ? (
                  <dl className="text-sm space-y-1">
                    <Campo rotulo="Número" valor={item.pedidoTiny.numero} />
                    <Campo rotulo="Situação" valor={item.pedidoTiny.situacao} />
                    <Campo rotulo="Cliente" valor={item.pedidoTiny.cliente} />
                    <Campo rotulo="Data" valor={item.pedidoTiny.data_pedido} />
                    <Campo
                      rotulo="Valor"
                      valor={formatCurrency(item.valor_pedido)}
                    />
                  </dl>
                ) : (
                  <p className="text-sm text-slate-500">
                    Pedido não localizado no Tiny no período consultado.
                  </p>
                )}

                {item.observacao && (
                  <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    {item.observacao}
                  </p>
                )}

                <p className="mt-3 text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-lg p-2">
                  Sem título em aberto no Tiny — venda anterior à integração ou
                  título já baixado. Não gera baixa.
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
});

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex gap-2 border-b border-slate-200/70 py-1">
      <dt className="font-medium text-slate-600 min-w-[72px]">{rotulo}:</dt>
      <dd className="text-slate-800">{valor}</dd>
    </div>
  );
}

/** Sem previsão possível, o % efetivo é o sinal de auditoria. */
function TaxaPercentual({ valor }: { valor: number }) {
  const alto = valor > 45;
  const baixo = valor < 15;
  const cor = alto
    ? "text-red-600 font-semibold"
    : baixo
      ? "text-amber-600 font-semibold"
      : "text-slate-700";
  return (
    <span
      className={cor}
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
