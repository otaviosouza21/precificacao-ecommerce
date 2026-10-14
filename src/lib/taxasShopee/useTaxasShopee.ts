"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  obterTaxasShopee,
  salvarTaxasShopee,
  TaxasShopeeApiError,
} from "./api";
import { validarFaixas } from "./faixas";
import { TAXAS_SHOPEE_PADRAO } from "./padrao";
import type { FaixaComissao, TaxasShopee } from "./types";

const TAXAS_INICIAIS: TaxasShopee = {
  faixas: TAXAS_SHOPEE_PADRAO,
  atualizadoEm: null,
  atualizadoPor: null,
  padrao: true,
};

// Tabela de taxas da Shopee compartilhada (banco). `pronto` só fica true
// depois da primeira resposta — quem calcula deve esperar por ele. Se a API
// falhar, segue com a tabela padrão e expõe o erro em `erroCarga`.
export function useTaxasShopee() {
  const { token } = useAuth();
  const [taxas, setTaxas] = useState<TaxasShopee>(TAXAS_INICIAIS);
  const [pronto, setPronto] = useState(false);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    obterTaxasShopee(token)
      .then((resp) => {
        if (cancelado) return;
        setTaxas(resp);
        setErroCarga(null);
      })
      .catch((err) => {
        console.error("Erro ao carregar taxas da Shopee:", err);
        if (cancelado) return;
        setErroCarga(
          err instanceof TaxasShopeeApiError
            ? err.message
            : "Erro ao carregar as taxas da Shopee.",
        );
      })
      .finally(() => {
        if (!cancelado) setPronto(true);
      });
    return () => {
      cancelado = true;
    };
  }, [token]);

  // Lança TaxasShopeeApiError (validação ou API) para quem chamou exibir.
  const salvar = useCallback(
    async (faixas: FaixaComissao[]) => {
      if (!token) {
        throw new TaxasShopeeApiError(401, "Não autenticado — refaça o login.");
      }
      const erro = validarFaixas(faixas);
      if (erro) throw new TaxasShopeeApiError(400, erro);
      const resp = await salvarTaxasShopee(token, faixas);
      setTaxas(resp);
      setErroCarga(null);
      return resp;
    },
    [token],
  );

  return { taxas, pronto, erroCarga, salvar };
}
