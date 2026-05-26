import { ParametrosCalculadora } from "./types";

export const PARAMETROS_PADRAO: ParametrosCalculadora = {
  margemDesejadaPct: 30,
  embalagem: 0.8,
  marketplaces: [
    {
      id: "shopee",
      nome: "Shopee",
      faixas: [
        {
          id: "shopee-1",
          precoMin: 0,
          precoMax: 79.99,
          comissaoPct: 20,
          taxaFixa: 4,
        },
        {
          id: "shopee-2",
          precoMin: 80,
          precoMax: 99.99,
          comissaoPct: 14,
          taxaFixa: 16,
        },
        {
          id: "shopee-3",
          precoMin: 100,
          precoMax: 199.99,
          comissaoPct: 14,
          taxaFixa: 20,
        },
        {
          id: "shopee-4",
          precoMin: 200,
          precoMax: 499.99,
          comissaoPct: 14,
          taxaFixa: 26,
        },
        {
          id: "shopee-5",
          precoMin: 500,
          precoMax: null,
          comissaoPct: 14,
          taxaFixa: 26,
        },
      ],
    },
  ],
};
