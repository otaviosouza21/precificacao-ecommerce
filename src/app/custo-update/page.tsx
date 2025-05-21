import getAllProdutos from "@/actions/getAllProdutos";
import CustoTiny from "@/components/CustoTiny/CustoTiny";

export default async function CustoUpdatePage() {
  const produtosReturnApi = await getAllProdutos();

  if (!produtosReturnApi.ok || !Array.isArray(produtosReturnApi.data)) {
    return <div>Erro ao carregar os produtos: {produtosReturnApi.error}</div>;
  }

  const produtos = produtosReturnApi.data;

  return <CustoTiny produtosTiny={produtos} />;
}
