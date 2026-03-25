import { TitulosReceberApiTiny } from "@/api/types/api-types";
import { ObjetoPlanilhaFinal } from "../LerPlanilha/FiltraJsonShopee";
import { RegraComissao } from "./formataDados";

export interface CalculaTaxasProps {
  planilha: ObjetoPlanilhaFinal;
  tituloRelacionado: TitulosReceberApiTiny;
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
