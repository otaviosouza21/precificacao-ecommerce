import { RotateCw, Upload, User } from "lucide-react";
import ActionButton from "../Forms/ActionButton";
import TitlePrimary from "../TitlePrimary";

export default function MainHeader() {
  return (
    <header className="flex justify-between px-7 py-4 bg-sky-700">
      <div>
        <TitlePrimary title="Bike Line" subtitle="Sistema de Automações" />
      </div>
      <div className="flex gap-4 items-center">
        <ActionButton icon={RotateCw} text="Sincronizar Tiny" />
        <User className="bg-sky-900 p-1 rounded-full cursor-pointer hover:bg-sky-800" size={40} />
      </div>
    </header>
  );
}
