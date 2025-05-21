import React from "react";

interface ResultCardProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  result: number;
  title: string;
}

export default function ResultCard({
  result,
  title,
  ...props
}: ResultCardProps) {
  return (
    <button
      className="bg-blue-200 cursor-pointer active:translate-0 rounded-2xl flex-1 text-start p-4 hover:-translate-y-1 transition-all border-blue-300 border h-20"
      {...props}
    >
      <h3 className="font-semibold">{title}</h3>
      <p>{result}</p>
    </button>
  );
}
