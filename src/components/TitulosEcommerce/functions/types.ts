import { TitulosReceberApiTiny } from "@/api/types/api-types";
import { ObjetoPlanilhaFinal } from "../LerPlanilha/FiltraJsonShopee";
import { RegraComissao } from "./formataDados";

export interface CalculaTaxasProps {
  planilha: ObjetoPlanilhaFinal;
  tituloRelacionado: TitulosReceberApiTiny;
  // Preço base do cálculo = precoPromocional do produto na tabela Shopee
  // (fonte de verdade de quanto o produto custou). Quando ausente (produto não
  // encontrado na API / sem preço), cai no valor do título do Tiny.
  precoBase?: number | null;
}

export interface CalculaTaxasReturn {
  valorCalculado: number;
  valorTaxa: number;
  regra: RegraComissao;
  houveArredondamento: boolean;
  detalhamento: {
    valorOriginal: number;
    valorBase: number;
    comissaoBruta: number;
    comissaoLiquida: number;
    taxaFixa: number;
    subsidio: number;
  };
}
