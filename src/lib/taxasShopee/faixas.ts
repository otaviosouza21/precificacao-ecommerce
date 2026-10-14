import type { FaixaComissao } from "./types";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function rotuloFaixa(f: FaixaComissao): string {
  return f.precoMax == null
    ? `${brl(f.precoMin)} ou mais`
    : `${brl(f.precoMin)} a ${brl(f.precoMax)}`;
}

// Faixa aplicável a um preço unitário: a última cujo precoMin ≤ preço. Assim
// o "vão" entre 79,99 e 80 (preço unitário fracionado) fica na faixa de baixo,
// e um preço abaixo da primeira faixa cai na primeira.
export function faixaDoPreco(
  preco: number,
  faixas: FaixaComissao[],
): FaixaComissao | null {
  const ordenadas = [...faixas].sort((a, b) => a.precoMin - b.precoMin);
  let escolhida = ordenadas[0] ?? null;
  for (const f of ordenadas) {
    if (preco >= f.precoMin) escolhida = f;
    else break;
  }
  return escolhida;
}

// Mesmas regras da API (que valida de novo ao salvar). null = válido.
export function validarFaixas(faixas: FaixaComissao[]): string | null {
  if (faixas.length === 0) return "Informe ao menos uma faixa.";
  if (faixas.length > 30) return "Máximo de 30 faixas.";

  for (const f of faixas) {
    const nums = [f.precoMin, f.comissaoPct, f.taxaFixa];
    if (f.precoMax != null) nums.push(f.precoMax);
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
      return `Faixa ${rotuloFaixa(f)}: valores devem ser números ≥ 0.`;
    }
    if (f.comissaoPct >= 100) {
      return `Faixa ${rotuloFaixa(f)}: comissão deve ser menor que 100%.`;
    }
    if (f.precoMax != null && f.precoMax < f.precoMin) {
      return `Faixa ${rotuloFaixa(f)}: o preço máximo é menor que o mínimo.`;
    }
  }

  const ordenadas = [...faixas].sort((a, b) => a.precoMin - b.precoMin);
  for (let i = 1; i < ordenadas.length; i++) {
    const anterior = ordenadas[i - 1];
    const atual = ordenadas[i];
    if (anterior.precoMax == null) {
      return "Só a faixa de maior preço pode ficar sem preço máximo.";
    }
    if (atual.precoMin <= anterior.precoMax) {
      return `As faixas ${rotuloFaixa(anterior)} e ${rotuloFaixa(atual)} se sobrepõem.`;
    }
  }
  return null;
}

// Compara só os valores (ignora ids e ordem).
export function faixasIguais(a: FaixaComissao[], b: FaixaComissao[]): boolean {
  if (a.length !== b.length) return false;
  const chave = (f: FaixaComissao) =>
    `${f.precoMin}|${f.precoMax ?? ""}|${f.comissaoPct}|${f.taxaFixa}`;
  const sa = a.map(chave).sort();
  const sb = b.map(chave).sort();
  return sa.every((v, i) => v === sb[i]);
}
