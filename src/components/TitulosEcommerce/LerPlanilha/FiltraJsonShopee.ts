export interface ObjetoPlanilhaFinal {
  id_ecommerce: string;
  nome_anuncio: string;
  dt_conclusao: string;
  valor_recebido: string;
}

export type PlanilhaXlsx = [
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string
][];

export default function LimpaJsonShopee(planilhaData: PlanilhaXlsx) {
  const planilhaSemHeader = planilhaData.slice(3, planilhaData.length);

  const planilhaFinal = planilhaSemHeader.filter((item) => {
    return item[1] === "Sku";
  });

  const objetoFinal = CriaObjetoPlanilha(planilhaFinal);

  return objetoFinal;
}

export function CriaObjetoPlanilha(planilha: PlanilhaXlsx) {
  console.log(planilha)
  return planilha.map((item) => {
    return {
      id_ecommerce: item[2],
      nome_anuncio: item[5],
      dt_conclusao: item[7],
      valor_recebido: item[10],
    } as ObjetoPlanilhaFinal;
  });
}
