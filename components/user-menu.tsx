"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { usePrefs } from "./prefs";

export function UserMenu({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { prefs, update } = usePrefs();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="size-9 rounded-full bg-accent-soft text-accent text-sm font-semibold grid place-items-center hover:ring-4 hover:ring-accent/15 transition"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu do usuário"
      >
        {initials || "?"}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-surface shadow-[var(--shadow)] p-2 text-sm">
          <p className="px-3 pt-2 pb-3 text-muted truncate">{name}</p>
          <div className="md:hidden border-t border-line pt-1 mt-1">
            <MenuLink href="/" onClick={() => setOpen(false)}>Legislação</MenuLink>
            <MenuLink href="/trilhas" onClick={() => setOpen(false)}>Trilhas de leitura</MenuLink>
            <MenuLink href="/doutrina" onClick={() => setOpen(false)}>Doutrina</MenuLink>
          </div>
          <div className="border-t border-line pt-1 mt-1">
            <MenuLink href="/notas" onClick={() => setOpen(false)}>Minhas notas e marcações</MenuLink>
            <MenuLink href="/estatisticas" onClick={() => setOpen(false)}>Estatísticas de leitura</MenuLink>
          </div>
          {isAdmin && (
            <div className="border-t border-line pt-1 mt-1">
              <MenuLink href="/admin/cobertura" onClick={() => setOpen(false)}>Cobertura e atualizações</MenuLink>
              <MenuLink href="/admin/usuarios" onClick={() => setOpen(false)}>Usuários</MenuLink>
              <MenuLink href="/admin/ranking" onClick={() => setOpen(false)}>Ranking de leitura</MenuLink>
              <MenuLink href="/admin/doutrina" onClick={() => setOpen(false)}>Editar doutrina</MenuLink>
            </div>
          )}
          <div className="border-t border-line pt-2 mt-1 px-3 pb-1">
            <p className="text-xs text-muted mb-2">Tema</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
              {(["light", "auto", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ theme: t === "auto" ? undefined : t })}
                  className={`h-8 rounded-lg text-xs ${(prefs.theme ?? "auto") === t ? "bg-surface shadow-sm font-medium" : "text-ink-2"}`}
                >
                  {t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Auto"}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-line pt-1 mt-2">
            <MenuLink href="/conta" onClick={() => setOpen(false)}>Alterar senha</MenuLink>
            <form action={logoutAction}>
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-2 text-err">Sair</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="block px-3 py-2 rounded-lg hover:bg-surface-2" role="menuitem">
      {children}
    </Link>
  );
}
