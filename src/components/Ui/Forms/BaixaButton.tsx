import { twMerge } from "tailwind-merge";

type primaryButtonProps = React.ComponentProps<"button"> & {
  textDefault: string;
  textProcessing?: string;
  icon?: React.ElementType;
  iconSize?: number;
  processing: boolean
};

export default function BaixaButton({
  icon: Icon,
  textDefault,
  textProcessing = "Processando...",
  className,
  iconSize = 20,
  processing = false,
  ...props
}: primaryButtonProps) {

  return (
    <button
      className={twMerge(
        `py-2 px-3 rounded-lg max-lg:text-sm flex items-center justify-center gap-2 font-medium 
         active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`,
        className
      )}
      disabled={processing}
      {...props}
    >
      {Icon && <Icon size={iconSize} />}
      {processing ? textProcessing : textDefault}
    </button>
  );
}