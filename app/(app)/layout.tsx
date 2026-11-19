import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { HeaderSearch } from "@/components/header-search";
import { UserMenu } from "@/components/user-menu";
import { NavLinks } from "@/components/nav-links";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
        <div className="mx-auto max-w-[1400px] h-16 px-4 sm:px-6 flex items-center gap-3 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight shrink-0" aria-label="Início">
            <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
              <rect width="64" height="64" rx="14" fill="var(--accent)" />
              <path d="M20 16h7v26h17v6H20z" fill="var(--accent-ink)" />
              <circle cx="44" cy="22" r="5" fill="#ffd54a" />
            </svg>
            <span className="hidden sm:inline text-[17px]">Legis</span>
          </Link>
          <NavLinks isAdmin={user.role === "admin"} />
          <div className="flex-1 min-w-0 flex justify-end md:justify-center">
            <HeaderSearch />
          </div>
          <UserMenu name={user.name} isAdmin={user.role === "admin"} />
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-line text-xs text-muted">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-2 justify-between">
          <p>Textos obtidos das fontes oficiais (Planalto, Senado Federal, STJ). Em caso de divergência, prevalece a publicação oficial.</p>
          <p>Legis · uso restrito</p>
        </div>
      </footer>
    </div>
  );
}
