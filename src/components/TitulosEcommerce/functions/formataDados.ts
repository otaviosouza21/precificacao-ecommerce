export const calculaTaxas = (valor_titulo: number) => {
  const valorCalculado = (valor_titulo - valor_titulo * 0.2 - 4);
  const valorTaxa = (valor_titulo - valorCalculado);
  return {
    valorCalculado,
    valorTaxa,
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
