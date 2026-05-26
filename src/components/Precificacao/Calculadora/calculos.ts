import {
  FaixaComissao,
  PrecoMinimoPorFaixa,
  ResultadoMinimo,
  ResultadoValidacao,
} from "./types";

export function calcularCustoMargemBase(
  custo: number,
  margemDesejadaPct: number
): number {
  return custo * (1 + margemDesejadaPct / 100);
}

export function calcularPrecoMinimoFaixa(
  custoMargemBase: number,
  embalagem: number,
  faixa: FaixaComissao
): number {
  const denominador = 1 - faixa.comissaoPct / 100;
  if (denominador <= 0) return Number.POSITIVE_INFINITY;
  return (custoMargemBase + embalagem + faixa.taxaFixa) / denominador;
}

function precoCabeNaFaixa(preco: number, faixa: FaixaComissao): boolean {
  if (preco < faixa.precoMin) return false;
  if (faixa.precoMax != null && preco > faixa.precoMax) return false;
  return true;
}

export function calcularResultadoMinimo(
  custo: number,
  margemDesejadaPct: number,
  embalagem: number,
  faixas: FaixaComissao[]
): ResultadoMinimo {
  const custoMargemBase = calcularCustoMargemBase(custo, margemDesejadaPct);
  const faixasOrdenadas = [...faixas].sort((a, b) => a.precoMin - b.precoMin);

  const porFaixa: PrecoMinimoPorFaixa[] = faixasOrdenadas.map((faixa) => {
    const precoMinimo = calcularPrecoMinimoFaixa(
      custoMargemBase,
      embalagem,
      faixa
    );
    return {
      faixa,
      precoMinimo,
      aplicavel: precoCabeNaFaixa(precoMinimo, faixa),
    };
  });

  const aplicavel = porFaixa.find((p) => p.aplicavel) ?? null;

  return {
    custoMargemBase,
    porFaixa,
    faixaAplicavel: aplicavel?.faixa ?? null,
    precoMinimoRecomendado: aplicavel?.precoMinimo ?? null,
  };
}

export function encontrarFaixaPorPreco(
  preco: number,
  faixas: FaixaComissao[]
): FaixaComissao | null {
  return (
    [...faixas]
      .sort((a, b) => a.precoMin - b.precoMin)
      .find((f) => precoCabeNaFaixa(preco, f)) ?? null
  );
}

export function calcularValidacao(
  precoVenda: number,
  custo: number,
  margemDesejadaPct: number,
  faixas: FaixaComissao[]
): ResultadoValidacao {
  const faixa = encontrarFaixaPorPreco(precoVenda, faixas);
  const comissaoPct = faixa?.comissaoPct ?? 0;
  const taxaFixa = faixa?.taxaFixa ?? 0;
  const valorLiquido = precoVenda * (1 - comissaoPct / 100) - taxaFixa;
  const custoMargemNecessaria = calcularCustoMargemBase(
    custo,
    margemDesejadaPct
  );
  const lucro = valorLiquido - custoMargemNecessaria;
  const margemReal = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0;

  return {
    faixa,
    comissaoPct,
    taxaFixa,
    valorLiquido,
    custoMargemNecessaria,
    lucro,
    margemReal,
  };
}

export function formatarFaixaLabel(faixa: FaixaComissao): string {
  const min = faixa.precoMin.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  if (faixa.precoMax == null) {
    return `${min} ou mais`;
  }
  const max = faixa.precoMax.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  return `${min} – ${max}`;
}
