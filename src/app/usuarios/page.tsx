import GuardaRole from "@/components/Gestao/GuardaRole";
import UsuariosView from "@/components/Gestao/UsuariosView";

export default function UsuariosPage() {
  return (
    <GuardaRole permitido={["ADMINISTRADOR", "MASTER"]}>
      <UsuariosView />
    </GuardaRole>
  );
}
