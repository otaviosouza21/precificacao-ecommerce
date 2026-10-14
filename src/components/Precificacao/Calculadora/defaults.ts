import { TAXAS_SHOPEE_PADRAO } from "@/lib/taxasShopee";
import { ParametrosCalculadora } from "./types";

// As faixas deste marketplace vêm da tabela "Taxas Shopee" (banco), a mesma
// usada na baixa de títulos V2. As dos demais ficam só no navegador.
export const MARKETPLACE_SHOPEE_ID = "shopee";

export const PARAMETROS_PADRAO: ParametrosCalculadora = {
  margemDesejadaPct: 30,
  embalagem: 0.8,
  marketplaces: [
    {
      id: MARKETPLACE_SHOPEE_ID,
      nome: "Shopee",
      faixas: TAXAS_SHOPEE_PADRAO,
    },
  ],
};
