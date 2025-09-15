import { ProdutoApi } from "@/api/types/api-types";
import { brlConvert } from "@/functions/brlConvert";
import { useState } from "react";
import { marketplaceParamsTypes } from "../Precificacao";
import { toast } from "react-toastify";
import { Info } from "lucide-react";

type TabelProdutoProps = {
  produto: ProdutoApi;
  formatarBRL: (valor: string) => {
    numero: number;
    texto: string;
  };
  marketplaceParams: marketplaceParamsTypes;
};

export default function TabelProduto({
  produto,
  formatarBRL,
  marketplaceParams,
}: TabelProdutoProps) {
  const [custosOperacionaisToggle, setCustosOperacionaisToggle] = useState(false)


  const calculaCustosOperacionais = (
    custos: marketplaceParamsTypes,
    preco_produto: number
  ) => {
    const impostos = preco_produto * custos.impostos;
    const comissao = preco_produto * custos.comissao;
    return comissao + custos.embalagem + custos.taxa + impostos;
  };

  const simulacaoAction = (produto: ProdutoApi) => {
    if (!simulacao.novoValor) return toast.warning('Defina um valor maior que 0 para simular')
    const valorNumerico = parseFloat(
      simulacao.novoValor
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "")
    );

    const precoAtual = valorNumerico;
    const custoOperacional = calculaCustosOperacionais(
      marketplaceParams,
      precoAtual
    );

    const custoTotal = produto.produto.preco_custo + custoOperacional;
    const novoLucro = valorNumerico - custoTotal;
    const novaMargem = (novoLucro / valorNumerico) * 100;
    const cor = novaMargem < 0 ? 'text-red-500' : "text-green-500"
    setSimulacao({
      ...simulacao,
      novoLucro,
      novaMargem,
      cor
    });
  };

  const [simulacao, setSimulacao] = useState({
    novoValor: "",
    novaMargem: 0,
    novoLucro: 0,
    cor: "text-white"
  });

  const precoAtual = produto.produto.preco_promocional ?? produto.produto.preco;
  const custoOperacional = calculaCustosOperacionais(
    marketplaceParams,
    precoAtual
  );
  const custoTotal = produto.produto.preco_custo + custoOperacional;
  const lucroReal = precoAtual - custoTotal;
  const margem = (lucroReal / precoAtual) * 100;

  return (
    <tr className="border-b border-gray-700 pr-3  hover:bg-[#1f2937]">
      <td>
        <input type="checkbox" className="ml-4" />
      </td>
      <td className="p-3">
        <div className="font-semibold text-white">{produto.produto.nome}</div>
        <div className="text-gray-400 text-xs">
          Cód: {produto.produto.codigo}
        </div>
      </td>
      <td className="p-3">{brlConvert(produto.produto.preco_custo)}</td>
      <td className="p-3 relative">
        <div onMouseOver={() => setCustosOperacionaisToggle(true)} onMouseLeave={() => setCustosOperacionaisToggle(false)} className="flex cursor-pointer items-center gap-2">
          {brlConvert(custoOperacional)}
          <Info className="size-4" />
        </div>
        {custosOperacionaisToggle &&
          <ul className="absolute w-40 top-5 left-20 bg-white/90 shadow text-xs p-2 text-black rounded-xl">
            <li className="font-bold">Embalagem: {brlConvert(marketplaceParams.embalagem)}</li>
            <li className="font-bold">Taxa Fixa: {brlConvert(marketplaceParams.taxa)}</li>
            <li>
              <span className="font-bold">Comissão: {(marketplaceParams.comissao * 100)}%</span>
              <span> {`(${(precoAtual * marketplaceParams.comissao).toFixed(2)})`}</span>
            </li>
            <li className="font-bold">Impostos: {(marketplaceParams.impostos * 100)}%</li>
          </ul>}
      </td>
      <td className="p-3">{brlConvert(custoTotal)}</td>
      <td className="p-3">{brlConvert(precoAtual)}</td>
      <td className="p-3">{brlConvert(lucroReal)}</td>
      <td className="p-3">{margem.toFixed(2)}%</td>
      <td className="p-3 ">
        <div className="flex flex-col">
          <span className={`font-semibold ${simulacao.cor}`}>
            {simulacao.novaMargem.toFixed(2)}%
          </span>
          <span className={`text-xs ${simulacao.cor}`}>{brlConvert(simulacao.novoLucro)}</span>
        </div>
      </td>
      <td className="p-3 flex items-center gap-2">
        <input
          type="text"
          className="bg-[#1f2937] text-white border border-gray-600 rounded px-2 py-1 w-24 text-sm"
          placeholder="R$"
          value={simulacao.novoValor}
          onChange={(e) => {
            const { texto } = formatarBRL(e.target.value);
            setSimulacao({ ...simulacao, novoValor: texto });
          }}
        />
        <button
          onClick={() => simulacaoAction(produto)}
          className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm"
        >
          Simular
        </button>
      </td>
    </tr >
  );
}
