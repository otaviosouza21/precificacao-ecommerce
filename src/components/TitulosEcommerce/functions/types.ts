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
  detalhamento: {
    valorOriginal: number;
    comissaoPercentual: number;
    taxaFixa: number;
    subsidio: number;
  };
}
