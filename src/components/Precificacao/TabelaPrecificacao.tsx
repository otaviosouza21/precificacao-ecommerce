import { ProdutoApi } from "@/api/types/api-types";
import { brlConvert } from "@/functions/brlConvert";

export default function TabelaProdutos({
  produtos,
}: {
  produtos: ProdutoApi[];
}) {
  return (
    <div className=" p-4 bg-[#111827] rounded-2xl text-white font-sans mt-4 ">
      <table className="w-full text-sm ">
        <thead className=" rounded-2xl">
          <tr className="text-gray-400 text-left border-b border-gray-700">
            <th className="p-3">PRODUTO</th>
            <th className="p-3">CUSTOS</th>
            <th className="p-3">PREÇO ATUAL</th>
            <th className="p-3">LUCRO </th>
            <th className="p-3">MARGEM</th>
            <th className="p-3">SIMULAÇÃO</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((produto, index) => (
            <tr
              key={index}
              className="border-b border-gray-700 hover:bg-[#1f2937]"
            >
              <td className="p-3">
                <div className="font-semibold text-white">
                  {produto.produto.nome}
                </div>
                <div className="text-gray-400 text-xs">
                  Cód: {produto.produto.codigo}
                </div>
              </td>

              <td className="p-3">{brlConvert(produto.produto.preco_custo)}</td>
              <td className="p-3">
                {brlConvert(
                  produto.produto.preco_promocional
                    ? produto.produto.preco_promocional
                    : produto.produto.preco
                )}
              </td>
              <td className="p-3">1</td>
              <td className="p-3">1</td>
              <td className="p-3 flex items-center gap-2">
                <input
                  type="text"
                  className="bg-[#1f2937] text-white border border-gray-600 rounded px-2 py-1 w-20 text-sm"
                  placeholder="R$"
                />
                <button className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-sm">
                  Simular
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
