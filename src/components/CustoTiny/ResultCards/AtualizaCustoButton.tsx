import { atualizarCustoTiny } from "@/actions/atualizarCustoTiny";
import { HandCoins, LoaderCircle } from "lucide-react";
import { JSX, useTransition } from "react";
import { toast } from "react-toastify";

type AtualizaCustoButtonProps = {
  pAlt: {
    custoPlanilha: number;
    id: number;
    codigo: string;
  };
  icone: string | Element | JSX.Element;
};

export default function AtualizaCustoButton({
  pAlt,
  icone = "➖",
}: AtualizaCustoButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={icone === "➖"}
      className="disabled:bg-gray-400  active:scale-98 cursor-pointer flex items-center text-sm gap-2 bg-blue-500 rounded-2xl p-2 text-blue-50"
      onClick={() =>
        startTransition(async () => {
          const resposta = await atualizarCustoTiny({
            custo: pAlt.custoPlanilha,
            id: pAlt.id,
          });

          if (resposta.success) {
            toast.success(
              `Custo do produto ${pAlt.codigo} atualizado com sucesso!`
            );
          } else {
            toast.success(
              `Erro ao atualizar produto ${pAlt.codigo}: ${resposta.message}`
            );
          }
        })
      }
    >
      Igualar Custo
      {isPending ? (
        <LoaderCircle size={15} className="animate-spin" />
      ) : (
        <HandCoins size={15} />
      )}
    </button>
  );
}
