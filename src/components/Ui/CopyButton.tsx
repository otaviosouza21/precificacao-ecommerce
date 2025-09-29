import React, { useState } from "react";
import { Copy, X, CopyCheck } from "lucide-react";

interface CopyButtonProps {
  text: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text }) => {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("success");
    } catch (err) {
      console.error("Erro ao copiar:", err);
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 1500);
  };

  const getIcon = () => {
    switch (status) {
      case "success":
        return <CopyCheck size={14} />;
      case "error":
        return <X size={14} />;
      default:
        return <Copy size={14} />;
    }
  };

  const getColor = () => {
    switch (status) {
      case "success":
        return "text-green-600 hover:text-green-700";
      case "error":
        return "text-red-600 hover:text-red-700";
      default:
        return "text-gray-600 hover:text-gray-800";
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded cursor-pointer transition-colors ${getColor()}`}
      title={
        status === "success"
          ? "Copiado!"
          : status === "error"
          ? "Erro ao copiar"
          : "Copiar"
      }
    >
      {getIcon()}
    </button>
  );
};