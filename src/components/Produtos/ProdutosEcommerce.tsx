"use client";

import { ProdutoApi } from "@/api/types/api-types";
import ProdutosEcommerceList from "./ProdutosEcommerceList";
import ProdutosEcommerceParametros from "./ProdutosEcommerceParametros";
import { useState } from "react";

export type ProdutosEcommerce = {
  produtos: ProdutoApi[];
};

export type ParametrosType = {
  "Taxa Shopee": number;
  "Comissao Shopee": number;
  Embalagem: number;
};

export default function ProdutosEcommerce({ produtos }: ProdutosEcommerce) {
  const [parametros, setParametros] = useState<ParametrosType>({
    "Taxa Shopee": 4,
    "Comissao Shopee": 20,
    Embalagem: 0.8,
  });

  const [search, setSearch] = useState("");
  const filterProducts = produtos.filter((produto) => {
    return (
      produto.produto.codigo
        .toLowerCase()
        .includes(search.toLocaleLowerCase()) ||
      produto.produto.nome.toLowerCase().includes(search.toLocaleLowerCase())
    );
  });

  return (
    <section>
      <ProdutosEcommerceParametros
        setSearch={setSearch}
        parametros={parametros}
      />
      <ProdutosEcommerceList
        produtos={filterProducts}
        parametros={parametros}
      />
    </section>
  );
}
