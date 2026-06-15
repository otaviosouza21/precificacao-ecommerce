"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import MainHeader from "@/components/Ui/Header/MainHeader";
import { useAuth } from "@/contexts/AuthContext";

const ROTAS_PUBLICAS = ["/login", "/esqueci-senha", "/redefinir-senha"];

// Rotas autenticadas exibidas em tela cheia (sem sidebar)
const ROTAS_TELA_CHEIA = ["/trocar-senha"];

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, carregando } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const rotaPublica = ROTAS_PUBLICAS.includes(pathname);

  useEffect(() => {
    if (carregando) return;
    if (!rotaPublica && !usuario) {
      router.replace("/login");
      return;
    }
    // Primeiro acesso: força a troca de senha antes de liberar o sistema
    if (
      usuario?.primeiroAcesso &&
      !rotaPublica &&
      pathname !== "/trocar-senha"
    ) {
      router.replace("/trocar-senha");
    }
  }, [carregando, usuario, rotaPublica, pathname, router]);

  if (rotaPublica) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  if (
    carregando ||
    !usuario ||
    (usuario.primeiroAcesso && pathname !== "/trocar-senha")
  ) {
    return <TelaCarregando />;
  }

  if (ROTAS_TELA_CHEIA.includes(pathname)) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <>
      <MainHeader />
      <main className="ml-15 flex-1 min-h-screen">{children}</main>
    </>
  );
}

function TelaCarregando() {
  return (
    <div className="flex-1 min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 size={32} className="animate-spin text-sky-700" />
      <p className="text-sm">Carregando...</p>
    </div>
  );
}
