export interface ObjetoPlanilhaFinal {
  id_ecommerce: string;
  nome_anuncio: string;
  dt_criacao_pedido: string;
  dt_conclusao: string;
  valor_recebido: string;
  cupom_rebate: number;
  taxa_afiliados: number;
  subisidio_pix: number;
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
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
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
  string,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number
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
      dt_criacao_pedido: item[6],
      dt_conclusao: item[7],
      valor_recebido: item[11],
      cupom_rebate: item[18],
      taxa_afiliados: item[30],
      subisidio_pix: item[44],
    } as ObjetoPlanilhaFinal;
  });
}
