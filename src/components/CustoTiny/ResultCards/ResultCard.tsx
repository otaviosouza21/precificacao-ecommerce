import React from "react";
import { twMerge } from "tw-merge";

interface ResultCardProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  result: number;
  title: string;
  className?: string;
}

export default function ResultCard({
  result,
  title,
  className,
  ...props
}: ResultCardProps) {
  return (
    <button
      className={twMerge(
        `transition-all ease-in-out active:translate-0 cursor-pointer duration-200 border-2 border-transparent shadow-md bg-white isolate rounded-2xl flex-1 text-start p-4 hover:-translate-y-1 translate-0 ${
          className ?? ""
        }`
      )}
      {...props}
    >
      <h3 className="font-semibold">{title}</h3>
      <p>{result}</p>
    </button>
  );
}
