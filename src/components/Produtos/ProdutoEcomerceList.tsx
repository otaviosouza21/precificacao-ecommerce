import { ProdutoApi } from "@/api/types/api-types";
import Input from "../Ui/Forms/Input";

type ProdutoEcommerceListProps = {
  item: ProdutoApi;
  index: number | string;
  margem: number
};

export default function ProdutoEcommerceList({
  item,
  index,
  margem
}: ProdutoEcommerceListProps) {
    
  return (
    <tr
      key={index}
      className="border-b hover:bg-slate-200 *:cursor-pointer transition-all"
    >
      <td className="px-6 py-4">{item.produto.codigo}</td>
      <td className="px-6 py-4 font-medium text-slate-900">
        {item.produto.nome}
      </td>
      <td className="px-6 py-4 font-medium text-slate-900">
        <Input id="teste"  type="text" />
      </td>
      <td className="px-6 py-4">
        R${" "}
        {Number(
          item.produto.preco_promocional
            ? item.produto.preco_promocional
            : item.produto.preco
        ).toFixed(2)}
      </td>
      <td className="px-6 py-4">
        R$ {Number(item.produto.preco_custo || 0).toFixed(2)}
      </td>
      <td className="px-6 py-4">
         {margem.toFixed(2)} %
      </td>
      <td className="px-6 py-4">
        R$ {Number(item.produto.preco_custo || 0).toFixed(2)}
      </td>
    </tr>
  );
}
