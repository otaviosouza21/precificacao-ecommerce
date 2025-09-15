import getAllProdutos from "@/actions/getAllProdutos";
import Precificacao from "@/components/Precificacao/Precificacao";

export default async function PrecificacaoPage() {
  const produtosReturnApi = await getAllProdutos();

  if (!produtosReturnApi.ok || !Array.isArray(produtosReturnApi.data)) {
    return <div>Erro ao carregar os produtos: {produtosReturnApi.error}</div>;
  }

  const produtos = produtosReturnApi.data;

  return <Precificacao produtos={produtos} />;
}
