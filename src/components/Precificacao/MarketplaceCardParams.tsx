import TitlePrimary from "../Ui/TitlePrimary";

type MarketplaceCardParamsProps = {
  marketplaceName: string;
  marketplaceTaxa?: number;
  marketplaceComis?: number;
  icon: React.ElementType;
};

export default function MarketplaceCardParams({
  marketplaceName,
  marketplaceTaxa = 4,
  marketplaceComis = 20,
  icon: Icon,
}: MarketplaceCardParamsProps) {
  return (
    <div className="hover:-translate-y-1 transition-all flex gap-2 items-center cursor-pointer bg-amber-800 py-4 pl-4 pr-25 rounded-2xl border-2 border-amber-700 text-amber-100">
      {Icon && (
        <Icon
          size={50}
          className=" rounded-2xl p-2 text-amber-100 text-primary-300 group-hover:text-primary-50"
        />
      )}
      <div>
        <TitlePrimary size="md" title={marketplaceName} />
        <p>
          Comissão: {marketplaceComis}% + Taxa: R${marketplaceTaxa} Fixo{" "}
        </p>
      </div>
    </div>
  );
}
