"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/lib/auth/types";
import { EstadoCarregando } from "./ui";

/**
 * Restringe o conteúdo aos perfis informados. A API revalida tudo no
 * backend — este guard é apenas para UX (evita telas sem permissão).
 */
export default function GuardaRole({
  permitido,
  children,
}: {
  permitido: Role[];
  children: React.ReactNode;
}) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();

  const autorizado = !!usuario && permitido.includes(usuario.role);

  useEffect(() => {
    if (!carregando && usuario && !autorizado) {
      router.replace("/");
    }
  }, [carregando, usuario, autorizado, router]);

  if (carregando || !usuario || !autorizado) {
    return <EstadoCarregando />;
  }

  return <>{children}</>;
}
