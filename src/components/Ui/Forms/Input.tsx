import { Search } from "lucide-react";
import { ElementType, InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  type: "text" | "number";
  id: string;
  value?: number | string;
  icon?: ElementType;
}

export default function Input({
  label,
  type,
  id,
  value,
  icon: Icon,
  onChange,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col font-medium justify-center ">
      {label && <label className="font-md" htmlFor={id}>{label}</label>}
      <div
        className={`focus-within:border-primary-600 flex- hover:border-sky-700 shadow-primary-300/40 flex items-center justify-center 
          gap-2 rounded-[10px] border-2 border-transparent bg-gray-400/35 pl-4 text-gray-50 transition-all outline-none
           focus-within:bg-gray-400/30 focus-within:shadow-[0px_0px_2px_2px] hover:bg-gray-400/30 hover:shadow-[0px_0px_2px_2px] 
           active:scale-99 dark:bg-gray-400/20 `}
      >
        {Icon && <Icon className="text-gray-700 dark:text-gray-400" />}
        <input
          className="flex w-full py-1 text-md  outline-0 placeholder:text-xl placeholder:text-gray-600/50  dark:placeholder:text-gray-500"
          value={value}
          id={id}
          type={type}
          onChange={onChange}
          {...props}
        />
      </div>
    </div>
  );
}
