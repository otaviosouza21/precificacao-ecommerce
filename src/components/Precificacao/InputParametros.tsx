"use client";

import { Calculator } from "lucide-react";
import ActionButton from "../Ui/Forms/ActionButton";
import Input from "../Ui/Forms/Input";
import { marketplaceParamsTypes } from "./Precificacao";
import { Dispatch, SetStateAction, useState } from "react";

export type InputParametrosType = {
  marketplaceParams: marketplaceParamsTypes;
  setMarketplaceParams: Dispatch<SetStateAction<marketplaceParamsTypes>>;
};

export default function InputParametros({
  marketplaceParams,
  setMarketplaceParams,
}: InputParametrosType) {
  const [tempParams, setTempParams] = useState(marketplaceParams);

  const handleChangeTempParam  = (type: string, value: number) => {
    setTempParams((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  return (
    <div className="flex mt-8 gap-4 items-end justify-center flex-wrap">
  
      <Input
        id="taxa"
        type="number"
        label="Taxa Fixa (R$)"
        value={tempParams.taxa}
        onChange={(e) => handleChangeTempParam("taxa", parseFloat(e.target.value))}
      />
      <Input
        id="comissao"
        type="number"
        label="Comissão (%)"
        value={tempParams.comissao}
        onChange={(e) => handleChangeTempParam("comissao", parseFloat(e.target.value))}
      />
      <Input
        id="custo"
        type="number"
        label="Embalagem (R$)"
        value={tempParams.embalagem}
        onChange={(e) => handleChangeTempParam("embalagem", parseFloat(e.target.value))}
      />

      <Input
        id="impostos"
        type="number"
        label="Impostos (%)"
        value={tempParams.impostos}
        onChange={(e) => handleChangeTempParam("impostos", parseFloat(e.target.value))}
      />
      <ActionButton icon={Calculator} text="Calcular" onClick={()=> setMarketplaceParams(tempParams)} />
    </div>
  );
}
