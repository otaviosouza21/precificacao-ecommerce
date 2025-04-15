import { ProdutoApi } from "@/api/types/api-types";
import ProdutoEcommerceList from "./ProdutoEcomerceList";
import { ParametrosType, ProdutosEcommerce } from "./ProdutosEcommerce";

type ProdutosEcommerceListProps = {
  produtos: ProdutoApi[];
  parametros: ParametrosType;
};

export default function ProdutosEcommerceList({
  produtos,
  parametros,
}: ProdutosEcommerceListProps) {

  const calcValuesPriceMargem = (
    currentValue: number,
    currentProdCoust: number
  ) => {
    //comissão = valor atual X 20%
    const currentComissao =
      currentValue * (parametros["Comissao Shopee"] / 100);

    //custo total = comissão + taxa shopee + embalagem
    const currentCoust =
      currentComissao + parametros.Embalagem + parametros["Taxa Shopee"];

    //preço - custo
    const currentPriceSubCoust = currentValue - currentCoust;

    //calcula a margem total
    const currentMargem = (currentPriceSubCoust / currentProdCoust) * 100 - 100;

    return currentMargem;
  };

  const calcValuesPriceMin = () =>{
    
  }

  return (
    <div className="overflow-x-auto text-slate-900 rounded-2xl shadow-md">
      <table className="min-w-full bg-slate-100 border border-slate-950 text-sm text-left">
        <thead className="bg-slate-700 text-slate-100  uppercase">
          <tr>
            <th className="px-6 py-3">SKU</th>
            <th className="px-6 py-3">Nome</th>
            <th className="px-6 py-3">Novo Preço</th>
            <th className="px-6 py-3">Preço Atual</th>
            <th className="px-6 py-3">Custo</th>
            <th className="px-6 py-3">Margem</th>
            <th className="px-6 py-3">Preço Minimo</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((item, index) => {
            const margem = calcValuesPriceMargem(
              item.produto.preco_promocional
                ? item.produto.preco_promocional
                : item.produto.preco,
              item.produto.preco_custo
            );

            return (
              <ProdutoEcommerceList
                item={item}
                index={item.produto.id}
                margem={margem}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
