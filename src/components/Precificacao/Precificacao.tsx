"use client";

import { ShoppingBag } from "lucide-react";
import TitlePrimary from "../Ui/TitlePrimary";
import InputParametros from "./InputParametros";
import MarketplaceCardParams from "./MarketplaceCardParams";
import TabelaProdutos from "./TabelaPrecificacao/TabelaPrecificacao";
import { ProdutoApi } from "@/api/types/api-types";
import { useState } from "react";

export type marketplaceParamsTypes = {
  taxa: number;
  comissao: number;
  embalagem: number;
  impostos: number;
};

export default function Precificacao({ produtos }: { produtos: ProdutoApi[] }) {
  const [marketplaceParams, setMarketplaceParams] =
    useState<marketplaceParamsTypes>({
      taxa: 4,
      comissao: 0.2,
      embalagem: 0.8,
      impostos: 0,
    });

  return (
    <div className="p-4 bg-slate-800 m-4 rounded-2xl h-full">
      <TitlePrimary title="Sistema de Precificação" />
   {/*    <div className=" w-7xl mx-auto  flex gap-2 justify-between mt-6">
        <MarketplaceCardParams marketplaceName="Shopee" icon={ShoppingBag} />
        <MarketplaceCardParams marketplaceName="Shopee" icon={ShoppingBag} />
        <MarketplaceCardParams marketplaceName="Shopee" icon={ShoppingBag} />
      </div> */}
      <InputParametros
        marketplaceParams={marketplaceParams}
        setMarketplaceParams={setMarketplaceParams}
      />
      <TabelaProdutos
        produtos={produtos}
        marketplaceParams={marketplaceParams}
      />
    </div>
  );
}
