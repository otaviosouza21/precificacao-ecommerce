import Link from "next/link";
import { navigation, type NavItem } from "@/config/navigation";

export default function Home() {
  const modules = navigation
    .flatMap((section) =>
      section.items.map((item) => ({ section: section.title, item }))
    )
    .filter(({ item }) => item.status !== "placeholder");

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Bike Line</h1>
        <p className="text-slate-500 mt-1">
          Sistema de Automações — selecione um módulo abaixo para começar.
        </p>
      </header>

      <section>
        <h2 className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-3">
          Módulos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(({ section, item }) => (
            <ModuleCard key={item.href} section={section} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuleCard({
  section,
  item,
}: {
  section: string;
  item: NavItem;
}) {
  const Icon = item.icon;
  const isWip = item.status === "wip";
  return (
    <Link
      href={item.href}
      className="group relative flex flex-col gap-3 p-5 rounded-lg border border-slate-200 bg-white hover:border-sky-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-sky-50 text-sky-700 group-hover:bg-sky-100">
          <Icon size={20} />
        </span>
        {isWip && (
          <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
            Em desenvolvimento
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
          {section}
        </p>
        <h3 className="text-lg font-semibold text-slate-800 group-hover:text-sky-800">
          {item.label}
        </h3>
        {item.description && (
          <p className="text-sm text-slate-500 mt-1">{item.description}</p>
        )}
      </div>
    </Link>
  );
}
