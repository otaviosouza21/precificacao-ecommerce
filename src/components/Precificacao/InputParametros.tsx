"use client";

import { Calculator } from "lucide-react";
import ActionButton from "../Ui/Forms/ActionButton";
import Input from "../Ui/Forms/Input";
import { useMemo, useState } from "react";

export default function InputParametros() {
  const [parametros, setParametros] = useState({
    taxa_marketplace: 4,
    comissao_marketplace: 0.2,
    custo_embalagem: 0.8,
    margem_lucro: 0.3,
    impostos: 0.18,
  });

  const [produtos, setProdutos] = useState([
    { codigo: "12.0005", nome: "ALAVANCA EZ-FIRE...", custo: 23.59 },
    { codigo: "12.0002", nome: "ALAVANCA NYLON...", custo: 4.65 },
    // mais produtos...
  ]);

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

  const precificados = useMemo(() => {
    return produtos.map((produto) => {
      const custoTotal = produto.custo + parametros.custo_embalagem;
      const precoSemImposto =
        custoTotal / (1 - parametros.comissao_marketplace / 100);
      const precoComImposto = precoSemImposto / (1 - parametros.impostos / 100);
      const precoFinal =
        precoComImposto * (1 + parametros.margem_lucro / 100) +
        parametros.taxa_marketplace;

      const lucro = precoFinal - custoTotal;
      const margem = (lucro / precoFinal) * 100;

      return {
        ...produto,
        precoFinal: precoFinal.toFixed(2),
        lucro: lucro.toFixed(2),
        margem: margem.toFixed(2),
      };
    });
  }, [
    parametros.taxa_marketplace,
    parametros.comissao_marketplace,
    parametros.custo_embalagem,
    parametros.margem_lucro,
    parametros.impostos,
  ]);

  console.log(precificados)

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
