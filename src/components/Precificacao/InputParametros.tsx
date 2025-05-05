"use client";

import { Calculator } from "lucide-react";
import ActionButton from "../Ui/Forms/ActionButton";
import Input from "../Ui/Forms/Input";
import { useState } from "react";



export default function InputParametros() {
  const [parametros, setParametros] = useState({
    taxa_marketplace: 4,
    comissao_marketplace: 0.2,
    custo_embalagem: 0.8,
    margem_lucro: 0.3,
    impostos: 0.18,
  });

  const handleChange =
    (key: keyof typeof parametros, isPercent = false) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const valor = e.target.value;

      // Permite o campo ficar vazio para digitação
      if (valor === "") {
        setParametros((prev) => ({ ...prev, [key]: "" as unknown as number }));
        return;
      }

      const numero = parseFloat(valor);
      setParametros((prev) => ({
        ...prev,
        [key]: isPercent ? numero / 100 : numero,
      }));
    };

  return (
    <div className="flex mt-8 gap-4 items-end justify-center flex-wrap">
      <Input
        id="taxa_marketplace"
        type="number"
        label="Taxa Fixa (R$)"
        value={parametros.taxa_marketplace.toString()}
        onChange={handleChange("taxa_marketplace")}
      />
      <Input
        id="comissao_marketplace"
        type="number"
        label="Comissão (%)"
        value={(parametros.comissao_marketplace * 100).toString()}
        onChange={handleChange("comissao_marketplace", true)}
      />
      <Input
        id="custo_embalagem"
        type="number"
        label="Embalagem (R$)"
        value={parametros.custo_embalagem.toString()}
        onChange={handleChange("custo_embalagem")}
      />
      <Input
        id="margem_lucro"
        type="number"
        label="Margem de Lucro (%)"
        value={(parametros.margem_lucro * 100).toString()}
        onChange={handleChange("margem_lucro", true)}
      />
      <Input
        id="impostos_marketplace"
        type="number"
        label="Impostos (%)"
        value={(parametros.impostos * 100).toString()}
        onChange={handleChange("impostos", true)}
      />
      <ActionButton icon={Calculator} text="Calcular" />
    </div>
  );
}
