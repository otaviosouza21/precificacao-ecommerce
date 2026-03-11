import { CalculaTaxasProps, CalculaTaxasReturn } from "./types";

enum REGRAS_COMISSAO {
  REGRA_1 = "REGRA_1",
  REGRA_2 = "REGRA_2",
  REGRA_3 = "REGRA_3",
  REGRA_4 = "REGRA_4",
  REGRA_5 = "REGRA_5",
}

export interface RegraComissao {
  perc_comissao_shopee: number;
  taxa_fixa_shopee: number;
  subsidio_pix: number;
}

// Tabela baseada na imagem fornecida
const tabelaComissao: Record<REGRAS_COMISSAO, RegraComissao> = {
  [REGRAS_COMISSAO.REGRA_1]: {
    perc_comissao_shopee: 0.2, // 20%
    taxa_fixa_shopee: 4.0,
    subsidio_pix: 0, // não tem subsídio
  },
  [REGRAS_COMISSAO.REGRA_2]: {
    perc_comissao_shopee: 0.14, // 14%
    taxa_fixa_shopee: 16.0,
    subsidio_pix: 0.05, // 5%
  },
  [REGRAS_COMISSAO.REGRA_3]: {
    perc_comissao_shopee: 0.14, // 14%
    taxa_fixa_shopee: 20.0,
    subsidio_pix: 0.05, // 5%
  },
  [REGRAS_COMISSAO.REGRA_4]: {
    perc_comissao_shopee: 0.14, // 14%
    taxa_fixa_shopee: 26.0,
    subsidio_pix: 0.05, // 5%
  },
  [REGRAS_COMISSAO.REGRA_5]: {
    perc_comissao_shopee: 0.14, // 14%
    taxa_fixa_shopee: 26.0,
    subsidio_pix: 0.08, // 8%
  },
};

export const defineRegraComissao = (valor_titulo: number): REGRAS_COMISSAO => {
  switch (true) {
    case valor_titulo <= 79.99:
      return REGRAS_COMISSAO.REGRA_1;
    case valor_titulo >= 80 && valor_titulo <= 99.99:
      return REGRAS_COMISSAO.REGRA_2;
    case valor_titulo >= 100 && valor_titulo <= 199.99:
      return REGRAS_COMISSAO.REGRA_3;
    case valor_titulo >= 200 && valor_titulo <= 499.99:
      return REGRAS_COMISSAO.REGRA_4;
    case valor_titulo >= 500:
      return REGRAS_COMISSAO.REGRA_5;
    default:
      return REGRAS_COMISSAO.REGRA_1;
  }
};

export const calculaTaxas = ({
  planilha: planilhaItem,
  tituloRelacionado,
}: CalculaTaxasProps): CalculaTaxasReturn => {
  const { dt_criacao_pedido, valor_recebido, taxa_afiliados } = planilhaItem;
  const { conta } = tituloRelacionado;
  // Extrai o mês da data de criação do pedido (0-11)
  const dataCriacaoData = new Date(dt_criacao_pedido).getMonth();

  // Define a regra de comissão com base no valor do título e na data de criação do pedido
  const regra =
    dataCriacaoData >= 2
      ? tabelaComissao[defineRegraComissao(+conta.valor)]
      : tabelaComissao.REGRA_1;

  const usouPix = 0;

  // Cálculo da comissão: percentual sobre o valor + taxa fixa
  const comissaoTotal =
    +conta.valor * regra.perc_comissao_shopee + regra.taxa_fixa_shopee;

  // Se usou Pix, aplica o subsídio (reduz a comissão)
  const subsidio = usouPix ? +conta.valor * regra.subsidio_pix : 0;

  // Taxa final é a comissão menos o subsídio
  let valorTaxa = comissaoTotal - subsidio - taxa_afiliados;

  // Valor que você recebe
  let valorCalculado = +conta.valor - valorTaxa;

  const diferencaRecebidoCalculado = (+valor_recebido - valorCalculado).toFixed(
    2,
  );

  // Se a diferença for -0.01, ajusta o valor calculado e a taxa
  if (+diferencaRecebidoCalculado === -0.01) {
    valorCalculado -= 0.01;
    valorTaxa += 0.01;
  }

  return {
    valorCalculado,
    valorTaxa,
    regra,
    detalhamento: {
      valorOriginal: +conta.valor,
      comissaoPercentual: +conta.valor * regra.perc_comissao_shopee,
      taxaFixa: regra.taxa_fixa_shopee,
      subsidio: subsidio,
    },
  };
};
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatDate = (dateString: string) => {
  try {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
  } catch {
    return dateString;
  }
};
