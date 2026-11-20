"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Legislação", match: (p: string) => p === "/" || p.startsWith("/lei") || p.startsWith("/area") },
  { href: "/trilhas", label: "Trilhas", match: (p: string) => p.startsWith("/trilhas") },
  { href: "/doutrina", label: "Doutrina", match: (p: string) => p.startsWith("/doutrina") },
  { href: "/estatisticas", label: "Estatísticas", match: (p: string) => p.startsWith("/estatisticas") },
  { href: "/notas", label: "Notas", match: (p: string) => p.startsWith("/notas") },
];

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/admin/cobertura", label: "Admin", match: (p: string) => p.startsWith("/admin") }] : LINKS;
  return (
    <nav className="hidden md:flex items-center gap-1 text-sm">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`px-3 py-1.5 rounded-lg transition ${l.match(path) ? "bg-surface-2 text-ink font-medium" : "text-ink-2 hover:text-ink hover:bg-surface-2"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
