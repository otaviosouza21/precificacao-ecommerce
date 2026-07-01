"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listarProdutos } from "./api";
import type {
  ListarProdutosParams,
  Produto,
  TabelaPreco,
} from "./types";

type UseProdutosResult = {
  produtos: Produto[];
  tabelasPreco: TabelaPreco[];
  total: number;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
};

/**
 * Carrega os produtos da Bikeline (Tiny) usando o token do AuthContext.
 * Refaz a busca quando os `params` mudam ou quando `recarregar()` é chamado.
 */
export function useProdutos(
  params: ListarProdutosParams = {},
): UseProdutosResult {
  const { token } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPreco[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Serializa os params para usar como dependência estável do efeito.
  const chaveParams = JSON.stringify(params);

  const buscar = useCallback(async () => {
    if (!token) return;
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await listarProdutos(token, JSON.parse(chaveParams));
      setProdutos(resposta.produtos);
      setTabelasPreco(resposta.tabelasPreco);
      setTotal(resposta.paginacao?.total ?? resposta.produtos.length);
    } catch (err) {
      console.error("Erro ao listar produtos:", err);
      setErro(
        err instanceof Error ? err.message : "Erro ao listar produtos",
      );
    } finally {
      setCarregando(false);
    }
  }, [token, chaveParams]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  return {
    produtos,
    tabelasPreco,
    total,
    carregando,
    erro,
    recarregar: buscar,
  };
}
