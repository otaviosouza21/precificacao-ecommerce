import EmpresasView from "@/components/Gestao/EmpresasView";
import GuardaRole from "@/components/Gestao/GuardaRole";

export default function EmpresasPage() {
  return (
    <GuardaRole permitido={["ADMINISTRADOR"]}>
      <EmpresasView />
    </GuardaRole>
  );
}
