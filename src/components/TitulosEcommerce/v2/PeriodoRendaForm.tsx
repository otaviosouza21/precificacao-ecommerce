"use client";

import FiltroPeriodo from "@/components/Ui/FiltroPeriodo";

type PeriodoRendaFormProps = {
  de: string;
  ate: string;
  setDe: (valor: string) => void;
  setAte: (valor: string) => void;
  onBuscar: () => void;
  carregando: boolean;
};

// Seleção do período de recebimento (substitui o upload da planilha da v1).
// A renda é buscada direto na API da Shopee pela data de recebimento.
// A UI vive em `Ui/FiltroPeriodo`, compartilhada com os demais relatórios.
export default function PeriodoRendaForm(props: PeriodoRendaFormProps) {
  return (
    <FiltroPeriodo
      {...props}
      titulo="Período de recebimento (renda Shopee)"
      rotuloBotao="Buscar renda"
      dica="Dica: prefira intervalos curtos (1 dia a 1 semana) — a varredura na Shopee fica mais lenta em períodos longos."
    />
  );
}
