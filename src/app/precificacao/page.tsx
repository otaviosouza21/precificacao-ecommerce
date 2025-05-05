import getAllProdutos from "@/actions/getAllProdutos";
import InputParametros from "@/components/Precificacao/InputParametros";
import MarketplaceCardParams from "@/components/Precificacao/MarketplaceCardParams";
import TabelaProdutos from "@/components/Precificacao/TabelaPrecificacao";
import ActionButton from "@/components/Ui/Forms/ActionButton";
import Input from "@/components/Ui/Forms/Input";
import TitlePrimary from "@/components/Ui/TitlePrimary";
import { Calculator, ShoppingBag } from "lucide-react";

export default async function PrecificacaoPage() {
  const produtosReturnApi = await getAllProdutos();

  if (!produtosReturnApi.ok || !Array.isArray(produtosReturnApi.data)) {
    return <div>Erro ao carregar os produtos: {produtosReturnApi.error}</div>;
  }

  const produtos = produtosReturnApi.data;

  return (
    <div className="p-4 bg-slate-800 m-4 rounded-2xl h-full">
      <TitlePrimary title="Sistema de Precificação" />
      <div className="flex gap-2 justify-around mt-4">
        <MarketplaceCardParams marketplaceName="Shopee" icon={ShoppingBag} />
        <MarketplaceCardParams marketplaceName="Shopee" icon={ShoppingBag} />
        <MarketplaceCardParams marketplaceName="Shopee" icon={ShoppingBag} />
      </div>
      <InputParametros />
      <TabelaProdutos produtos={produtos} />
    </div>
  );
}
