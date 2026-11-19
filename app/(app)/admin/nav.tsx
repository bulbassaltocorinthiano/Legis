import Link from "next/link";

export function AdminNav({ current }: { current: "cobertura" | "usuarios" | "doutrina" }) {
  const items = [
    ["cobertura", "Cobertura e atualizações"],
    ["usuarios", "Usuários"],
    ["doutrina", "Doutrina"],
  ] as const;
  return (
    <nav className="flex gap-1 rounded-xl bg-surface-2 p-1 text-sm w-fit max-w-full overflow-x-auto no-scrollbar">
      {items.map(([k, label]) => (
        <Link key={k} href={`/admin/${k}`} className={`shrink-0 px-3 h-8 rounded-lg grid place-items-center ${current === k ? "bg-surface shadow-sm font-medium" : "text-ink-2 hover:text-ink"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
