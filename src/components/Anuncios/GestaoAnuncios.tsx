"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, RefreshCw, Search } from "lucide-react";
import { toast } from "react-toastify";
import { useAuth } from "@/contexts/AuthContext";
import {
  gestaoAnuncios,
  sincronizarPrecosAnuncios,
  atualizarPrecoAnuncio,
  type ItemGestaoAnuncio,
} from "@/lib/anuncios";

function parseNumero(txt: string): number | null {
  const limpo = txt.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : null;
}

// Recalcula a divergência local após salvar a referência.
function comRefLocal(
  item: ItemGestaoAnuncio,
  refAtual: number | null,
  refOriginal: number | null,
): ItemGestaoAnuncio {
  const diverge =
    item.shopeeAtual != null &&
    refAtual != null &&
    Math.abs(item.shopeeAtual - refAtual) >= 0.01;
  return {
    ...item,
    refAtual,
    refOriginal: refOriginal ?? item.refOriginal,
    refSincronizadoEm: new Date().toISOString(),
    diverge,
  };
}

const brl = (v: number | null) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function formataData(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function GestaoAnuncios() {
  const { token } = useAuth();
  const [itens, setItens] = useState<ItemGestaoAnuncio[] | null>(null);
  const [geradoEm, setGeradoEm] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    setErro(null);
    try {
      const resp = await gestaoAnuncios(token);
      setItens(resp.itens);
      setGeradoEm(resp.geradoEm);
    } catch (err) {
      console.error("Erro ao carregar gestão de anúncios:", err);
      setErro(
        err instanceof Error ? err.message : "Erro ao carregar os anúncios.",
      );
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function sincronizar() {
    if (!token) return;
    setSincronizando(true);
    try {
      const { total } = await sincronizarPrecosAnuncios(token);
      toast.success(`Referência atualizada: ${total} SKUs.`);
      await carregar();
    } catch (err) {
      console.error("Erro ao sincronizar preços:", err);
      toast.error("Não foi possível sincronizar os preços.");
    } finally {
      setSincronizando(false);
    }
  }

  const [salvandoSku, setSalvandoSku] = useState<string | null>(null);

  // Salva a referência de um SKU (valor manual OU o preço da Shopee da linha).
  async function salvarRef(
    item: ItemGestaoAnuncio,
    precoAtual: number,
    precoOriginal?: number,
  ) {
    if (!token) return;
    setSalvandoSku(item.sku);
    try {
      const r = await atualizarPrecoAnuncio(token, item.sku, {
        precoAtual,
        precoOriginal,
        itemId: item.itemId,
        nome: item.nome,
      });
      setItens(
        (prev) =>
          prev?.map((i) =>
            i.sku === item.sku ? comRefLocal(i, r.precoAtual, r.precoOriginal) : i,
          ) ?? prev,
      );
      toast.success(`Referência de ${item.sku} salva.`);
    } catch (err) {
      console.error("Erro ao salvar referência:", err);
      toast.error("Não foi possível salvar a referência.");
    } finally {
      setSalvandoSku(null);
    }
  }

  // Iguala a referência da linha ao preço da Shopee mostrado.
  function sincronizarLinha(item: ItemGestaoAnuncio) {
    if (item.shopeeAtual == null) {
      toast.warning("Este SKU não tem preço da Shopee.");
      return;
    }
    salvarRef(item, item.shopeeAtual, item.shopeeOriginal ?? undefined);
  }

  const filtrados = useMemo(() => {
    if (!itens) return [];
    const q = busca.trim().toLowerCase();
    if (!q) return itens;
    return itens.filter(
      (i) =>
        i.nome.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.variacao.toLowerCase().includes(q),
    );
  }, [itens, busca]);

  // Agrupa por anúncio (itemId), preservando a ordem de chegada.
  const grupos = useMemo(() => {
    const mapa = new Map<string, ItemGestaoAnuncio[]>();
    for (const i of filtrados) {
      const arr = mapa.get(i.itemId);
      if (arr) arr.push(i);
      else mapa.set(i.itemId, [i]);
    }
    return [...mapa.entries()];
  }, [filtrados]);

  const totais = useMemo(() => {
    const total = itens?.length ?? 0;
    const divergentes = itens?.filter((i) => i.diverge).length ?? 0;
    const semRef = itens?.filter((i) => i.refAtual == null).length ?? 0;
    return { total, divergentes, semRef };
  }, [itens]);

  return (
    <div className="p-4">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">Gestão de Preços | Anúncios</h1>
        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-400/40">
          Shopee ao vivo × referência
        </span>
        <button
          type="button"
          onClick={sincronizar}
          disabled={sincronizando || carregando}
          className="ml-auto flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`}
          />
          {sincronizando ? "Sincronizando..." : "Sincronizar referência"}
        </button>
      </div>

      {/* Resumo + busca */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por produto, SKU ou variação..."
            className="w-full text-sm text-slate-800 outline-none"
          />
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <span>
            SKUs: <strong className="text-slate-800">{totais.total}</strong>
          </span>
          <span className="text-amber-700">
            Divergentes: <strong>{totais.divergentes}</strong>
          </span>
          <span className="text-slate-500">
            Sem referência: <strong>{totais.semRef}</strong>
          </span>
          {geradoEm && <span>Consulta: {formataData(geradoEm)}</span>}
        </div>
      </div>

      {erro && (
        <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <strong>Erro:</strong> {erro}
        </div>
      )}

      {carregando && (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
          <span className="ml-3 text-slate-600">
            Buscando anúncios ao vivo na Shopee (pode levar alguns segundos)...
          </span>
        </div>
      )}

      {!carregando && itens && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Variação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <div className="flex flex-col">
                      <span>Preço Shopee</span>
                      <span className="text-xs font-bold text-orange-500">
                        ao vivo
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <div className="flex flex-col">
                      <span>Referência</span>
                      <span className="text-xs font-bold text-indigo-500">
                        nosso banco
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Última sync
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {grupos.map(([itemId, linhas]) => (
                  <GrupoAnuncio
                    key={itemId}
                    nome={linhas[0].nome}
                    linhas={linhas}
                    salvandoSku={salvandoSku}
                    onSalvar={salvarRef}
                    onSincronizar={sincronizarLinha}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {itens.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              Nenhum anúncio encontrado. Clique em “Sincronizar referência”.
            </div>
          )}
          {itens.length > 0 && filtrados.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              Nenhum resultado para “{busca}”.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GrupoAnuncio({
  nome,
  linhas,
  salvandoSku,
  onSalvar,
  onSincronizar,
}: {
  nome: string;
  linhas: ItemGestaoAnuncio[];
  salvandoSku: string | null;
  onSalvar: (
    item: ItemGestaoAnuncio,
    precoAtual: number,
    precoOriginal?: number,
  ) => void;
  onSincronizar: (item: ItemGestaoAnuncio) => void;
}) {
  return (
    <>
      <tr className="bg-slate-50/70">
        <td
          colSpan={6}
          className="px-6 py-2 text-sm font-semibold text-slate-800"
        >
          {nome || "(sem nome)"}
        </td>
      </tr>
      {linhas.map((l) => (
        <LinhaGestao
          key={`${l.itemId}-${l.modelId}-${l.sku}`}
          item={l}
          salvando={salvandoSku === l.sku}
          onSalvar={onSalvar}
          onSincronizar={onSincronizar}
        />
      ))}
    </>
  );
}

function LinhaGestao({
  item,
  salvando,
  onSalvar,
  onSincronizar,
}: {
  item: ItemGestaoAnuncio;
  salvando: boolean;
  onSalvar: (
    item: ItemGestaoAnuncio,
    precoAtual: number,
    precoOriginal?: number,
  ) => void;
  onSincronizar: (item: ItemGestaoAnuncio) => void;
}) {
  const [txt, setTxt] = useState(
    item.refAtual != null ? String(item.refAtual) : "",
  );
  useEffect(() => {
    setTxt(item.refAtual != null ? String(item.refAtual) : "");
  }, [item.refAtual]);

  const commit = () => {
    const n = parseNumero(txt);
    if (n == null) {
      setTxt(item.refAtual != null ? String(item.refAtual) : "");
      return;
    }
    if (item.refAtual != null && Math.abs(n - item.refAtual) < 0.005) return;
    onSalvar(item, n);
  };

  return (
    <tr className="transition-colors hover:bg-indigo-50/50">
      <td className="px-6 py-3 text-sm text-slate-700">
        {item.variacao || "—"}
      </td>
      <td className="px-6 py-3 text-sm font-medium text-slate-900">
        {item.sku}
      </td>
      <td className="px-6 py-3 text-sm">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">
            {brl(item.shopeeAtual)}
          </span>
          {item.shopeeOriginal != null &&
            item.shopeeOriginal !== item.shopeeAtual && (
              <span className="text-xs text-slate-400 line-through">
                {brl(item.shopeeOriginal)}
              </span>
            )}
        </div>
      </td>
      <td className="px-6 py-3 text-sm">
        <div className="flex items-center gap-1.5">
          <div
            className={`flex items-center rounded-lg border bg-white px-2 focus-within:ring-2 ${
              item.diverge
                ? "border-amber-300 focus-within:ring-amber-200"
                : "border-slate-300 focus-within:ring-indigo-200"
            }`}
          >
            <span className="text-xs text-slate-400">R$</span>
            <input
              value={txt}
              onChange={(e) => setTxt(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              disabled={salvando}
              inputMode="decimal"
              placeholder="—"
              className={`w-20 bg-transparent px-1 py-1.5 text-sm outline-none disabled:opacity-50 ${
                item.diverge ? "font-semibold text-amber-700" : "text-indigo-700"
              }`}
            />
          </div>
          <button
            type="button"
            onClick={() => onSincronizar(item)}
            disabled={salvando}
            title="Igualar ao preço da Shopee"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${salvando ? "animate-spin" : ""}`} />
          </button>
        </div>
      </td>
      <td className="px-6 py-3 text-xs text-slate-500">
        {formataData(item.refSincronizadoEm)}
      </td>
      <td className="px-6 py-3">
        {item.refAtual == null ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            Sem referência
          </span>
        ) : item.diverge ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-600/20">
            <AlertTriangle className="h-3 w-3" />
            Divergente
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 ring-1 ring-green-600/20">
            <Check className="h-3 w-3" />
            OK
          </span>
        )}
      </td>
    </tr>
  );
}
