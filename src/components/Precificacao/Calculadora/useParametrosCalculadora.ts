"use client";

import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";
import { PARAMETROS_PADRAO } from "./defaults";
import { ParametrosCalculadora } from "./types";

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

export function useParametrosCalculadora(): {
  parametros: ParametrosCalculadora;
  setParametros: Dispatch<SetStateAction<ParametrosCalculadora>>;
  restaurarPadrao: () => void;
  pronto: boolean;
} {
  const [parametros, setParametros] = useState<ParametrosCalculadora>(
    PARAMETROS_PADRAO
  );
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setParametros(carregar());
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parametros));
    } catch {
      // ignore quota / private-mode failures
    }
  }, [parametros, pronto]);

  const restaurarPadrao = useCallback(() => {
    setParametros(PARAMETROS_PADRAO);
  }, []);

  return { parametros, setParametros, restaurarPadrao, pronto };
}
