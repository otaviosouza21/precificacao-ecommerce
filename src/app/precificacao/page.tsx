import getAllProdutos from "@/actions/getAllProdutos";
import ProdutosEcommerce from "@/components/Produtos/ProdutosEcommerce";
import ProdutosEcommerceList from "@/components/Produtos/ProdutosEcommerceList";

export default async function PrecificacaoPage() {
  const produtosReturnApi = await getAllProdutos();

  if (!produtosReturnApi.ok || !Array.isArray(produtosReturnApi.data)) {
    return <div>Erro ao carregar os produtos: {produtosReturnApi.error}</div>;
  }

  const produtos = produtosReturnApi.data;


  return (
    <div className="p-4">
      <ProdutosEcommerce produtos={produtos} />
    </div>
  );
}
