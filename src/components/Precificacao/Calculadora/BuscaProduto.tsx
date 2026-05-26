"use client";

import { buscarProdutosV3, ProdutoBusca } from "@/actions/v3/buscarProdutosV3";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProdutoCalculadora } from "./types";

type Props = {
  selecionado: ProdutoCalculadora | null;
  onSelecionar: (produto: ProdutoCalculadora) => void;
  onLimpar: () => void;
};

export default function BuscaProduto({
  selecionado,
  onSelecionar,
  onLimpar,
}: Props) {
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ProdutoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const t = termo.trim();
    if (t.length < 2) {
      setResultados([]);
      setErro(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      setErro(null);
      const r = await buscarProdutosV3({ termo: t, limite: 10 });
      setBuscando(false);
      if (r.ok) {
        setResultados(r.itens);
        setAberto(true);
      } else {
        setErro(r.mensagem);
        setResultados([]);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [termo]);

  function selecionar(p: ProdutoBusca) {
    if (!p.id) return;
    onSelecionar({
      id: p.id,
      sku: p.sku,
      nome: p.nome,
      custo: typeof p.precoCusto === "number" ? p.precoCusto : 0,
    });
    setTermo("");
    setResultados([]);
    setAberto(false);
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <label className="text-xs text-sky-300 font-medium mb-1.5 block">
        Produto
      </label>

      {selecionado && (
        <div className="flex items-center justify-between gap-3 mb-3 bg-sky-800/60 border border-sky-600/50 text-sky-100 px-3 py-2 rounded-lg">
          <div className="min-w-0">
            <p className="text-sm truncate">{selecionado.nome}</p>
            <p className="font-mono text-xs text-sky-300">{selecionado.sku}</p>
          </div>
          <button
            type="button"
            onClick={onLimpar}
            className="text-sky-300 hover:text-white"
            aria-label="Trocar produto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative">
        <div className="flex items-center gap-2 bg-sky-950 border border-sky-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-sky-500">
          <Search className="w-4 h-4 text-sky-500" />
          <input
            type="text"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onFocus={() => resultados.length > 0 && setAberto(true)}
            placeholder={
              selecionado
                ? "Buscar outro produto..."
                : "Buscar por nome ou código (mín. 2 caracteres)..."
            }
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-sky-600"
          />
          {buscando && (
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          )}
          {termo && !buscando && (
            <button
              type="button"
              onClick={() => {
                setTermo("");
                setResultados([]);
              }}
              className="text-sky-500 hover:text-sky-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {aberto && resultados.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-sky-950 border border-sky-700 rounded-lg shadow-xl max-h-72 overflow-y-auto">
            {resultados.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => selecionar(p)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-sky-800/60 border-t border-sky-800 first:border-t-0"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm truncate">{p.nome}</p>
                  <p className="text-sky-400 text-xs font-mono">{p.sku}</p>
                </div>
                {typeof p.precoCusto === "number" && p.precoCusto > 0 && (
                  <span className="text-xs text-sky-300 whitespace-nowrap">
                    {p.precoCusto.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {aberto &&
          !buscando &&
          termo.length >= 2 &&
          resultados.length === 0 &&
          !erro && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-sky-950 border border-sky-700 rounded-lg px-3 py-3 text-sm text-sky-400">
              Nenhum produto encontrado.
            </div>
          )}

        {erro && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-red-950 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
            {erro}
          </div>
        )}
      </div>
    </div>
  );
}
