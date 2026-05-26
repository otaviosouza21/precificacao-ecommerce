"use client";

export default function DashCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${bg} border border-white/10 rounded-xl p-4 flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2 text-xs text-sky-300 font-medium">
        {icon}
        {label}
      </div>
      <p className="text-white font-bold text-lg leading-none">{value}</p>
    </div>
  );
}
