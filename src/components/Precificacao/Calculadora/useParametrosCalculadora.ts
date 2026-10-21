"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { faixasIguais, useTaxasShopee } from "@/lib/taxasShopee";
import { MARKETPLACE_SHOPEE_ID, PARAMETROS_PADRAO } from "./defaults";
import { FaixaComissao, ParametrosCalculadora } from "./types";

const STORAGE_KEY = "precificacao:parametros:v1";

function carregar(): ParametrosCalculadora {
  if (typeof window === "undefined") return PARAMETROS_PADRAO;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return PARAMETROS_PADRAO;
    const data = JSON.parse(raw) as Partial<ParametrosCalculadora>;
    return {
      margemDesejadaPct:
        typeof data.margemDesejadaPct === "number"
          ? data.margemDesejadaPct
          : PARAMETROS_PADRAO.margemDesejadaPct,
      embalagem:
        typeof data.embalagem === "number"
          ? data.embalagem
          : PARAMETROS_PADRAO.embalagem,
      marketplaces:
        Array.isArray(data.marketplaces) && data.marketplaces.length > 0
          ? data.marketplaces
          : PARAMETROS_PADRAO.marketplaces,
    };
  } catch {
    return PARAMETROS_PADRAO;
  }
}

// Garante o marketplace Shopee e aplica a ele as faixas compartilhadas.
function comTaxasShopee(
  locais: ParametrosCalculadora,
  faixasShopee: FaixaComissao[] | null,
): ParametrosCalculadora {
  const temShopee = locais.marketplaces.some(
    (m) => m.id === MARKETPLACE_SHOPEE_ID,
  );
  const marketplaces = temShopee
    ? locais.marketplaces
    : [PARAMETROS_PADRAO.marketplaces[0], ...locais.marketplaces];
  if (!faixasShopee && temShopee) return locais;
  return {
    ...locais,
    marketplaces: marketplaces.map((m) =>
      m.id === MARKETPLACE_SHOPEE_ID && faixasShopee
        ? { ...m, faixas: faixasShopee }
        : m,
    ),
  };
}

export function useParametrosCalculadora(): {
  parametros: ParametrosCalculadora;
  salvarParametros: (p: ParametrosCalculadora) => Promise<void>;
  pronto: boolean;
} {
  const [locais, setLocais] = useState<ParametrosCalculadora>(
    PARAMETROS_PADRAO
  );
  const [pronto, setPronto] = useState(false);
  const {
    taxas,
    pronto: taxasProntas,
    salvar: salvarTaxas,
  } = useTaxasShopee();

  useEffect(() => {
    setLocais(carregar());
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(locais));
    } catch {
      // ignore quota / private-mode failures
    }
  }, [locais, pronto]);

  const parametros = useMemo(
    () => comTaxasShopee(locais, taxasProntas ? taxas.faixas : null),
    [locais, taxasProntas, taxas.faixas]
  );

  // Faixas da Shopee alteradas vão para o banco (valem para todos); o resto
  // fica no navegador. Lança se o banco recusar — o modal mostra o erro.
  const salvarParametros = useCallback(
    async (novos: ParametrosCalculadora) => {
      const shopeeNovo = novos.marketplaces.find(
        (m) => m.id === MARKETPLACE_SHOPEE_ID
      );
      const shopeeAtual = parametros.marketplaces.find(
        (m) => m.id === MARKETPLACE_SHOPEE_ID
      );
      if (
        shopeeNovo &&
        (!shopeeAtual || !faixasIguais(shopeeNovo.faixas, shopeeAtual.faixas))
      ) {
        await salvarTaxas(shopeeNovo.faixas);
      }
      setLocais(novos);
    },
    [parametros, salvarTaxas]
  );

  return { parametros, salvarParametros, pronto };
}
