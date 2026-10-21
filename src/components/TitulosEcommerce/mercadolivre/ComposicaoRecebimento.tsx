"use client";

import { formatCurrency } from "../functions/formataDados";
import type { RecebimentoML } from "./parseReserveML";

/**
 * Composição do recebimento, linha a linha.
 *
 * É o coração do valor da tela: como não existe tabela de tarifa previsível no
 * Mercado Livre, a única forma de auditar é ver a decomposição que o próprio
 * relatório entrega. Usado nos dois modos (conferência e título).
 */
export default function ComposicaoRecebimento({
  rec,
}: {
  rec: RecebimentoML;
}) {
  const linhas: { rotulo: string; valor: number; negativo?: boolean }[] = [
    { rotulo: "Valor bruto da operação", valor: rec.valor_bruto },
    { rotulo: "Tarifa Mercado Livre", valor: rec.tarifa, negativo: true },
    { rotulo: "Custo de envio", valor: rec.custo_envio, negativo: true },
    {
      rotulo: "Tarifa de parcelamento",
      valor: rec.tarifa_parcelamento,
      negativo: true,
    },
  ];

  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
        Composição do recebimento
      </h4>
      <table className="w-full text-sm">
        <tbody>
          {linhas.map((l) => (
            <tr key={l.rotulo} className="border-b border-slate-200/70">
              <td className="py-1.5 text-slate-600">{l.rotulo}</td>
              <td
                className={`py-1.5 text-right font-medium ${
                  l.negativo && l.valor !== 0 ? "text-red-600" : "text-slate-900"
                }`}
              >
                {formatCurrency(l.valor)}
              </td>
            </tr>
          ))}
          <tr>
            <td className="py-1.5 font-semibold text-slate-800">
              Líquido creditado
            </td>
            <td className="py-1.5 text-right font-bold text-emerald-700">
              {formatCurrency(rec.valor_recebido)}
            </td>
          </tr>
        </tbody>
      </table>

      <dl className="mt-3 space-y-1 text-xs text-slate-500">
        {rec.sku && (
          <div className="flex gap-2">
            <dt className="font-medium text-slate-600">SKU:</dt>
            <dd>{rec.sku}</dd>
          </div>
        )}
        {rec.anuncio && (
          <div className="flex gap-2">
            <dt className="font-medium text-slate-600">Anúncio:</dt>
            <dd>{rec.anuncio}</dd>
          </div>
        )}
        {rec.parcelas_comprador > 1 && (
          <div className="flex gap-2">
            <dt className="font-medium text-slate-600">
              Parcelado pelo comprador:
            </dt>
            <dd>
              {rec.parcelas_comprador}× — o Mercado Livre liberou o valor inteiro
              de uma só vez
            </dd>
          </div>
        )}
        {rec.cupom !== 0 && (
          <div className="flex gap-2">
            <dt className="font-medium text-slate-600">Cupom:</dt>
            <dd>{formatCurrency(rec.cupom)}</dd>
          </div>
        )}
        {rec.linhas > 1 && (
          <div className="flex gap-2">
            <dt className="font-medium text-slate-600">Movimentos:</dt>
            <dd>
              {rec.linhas} linhas — {rec.tipos.join(", ")}
            </dd>
          </div>
        )}
        {rec.descricao_produto && (
          <div className="flex gap-2">
            <dt className="font-medium text-slate-600">Produto:</dt>
            <dd className="truncate">{rec.descricao_produto}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
