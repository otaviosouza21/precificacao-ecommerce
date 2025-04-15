import { RefreshCcw, Search } from "lucide-react";
import Input from "../Ui/Forms/Input";
import { ParametrosType } from "./ProdutosEcommerce";
import { Dispatch, SetStateAction } from "react";
import ActionButton from "../Ui/Forms/ActionButton";

export default function ProdutosEcommerceParametros({
  parametros,
  setSearch,
}: {
  parametros: ParametrosType;
  setSearch: Dispatch<SetStateAction<string>>;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center justify-center">
        <Input
          label="Pesquisar Produto"
          id="search_produto"
          icon={Search}
          type="text"
          onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
        <ActionButton icon={RefreshCcw} text="Atualizar" />
      </div>
      <div className="flex justify-around  gap-2">
        {parametros &&
          Object.keys(parametros).map((key) => {
            const typedKey = key as keyof ParametrosType;
            return (
              <Input
                key={key}
                label={typedKey}
                id={typedKey}
                value={parametros[typedKey]}
                type="number"
              />
            );
          })}
      </div>
    </div>
  );
}
