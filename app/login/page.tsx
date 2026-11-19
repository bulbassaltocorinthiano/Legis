import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next && next.startsWith("/") ? next : "/");
  return (
    <main className="min-h-dvh grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between p-12 bg-[#0f1b3d] text-white relative overflow-hidden">
        <div className="flex items-center gap-3 text-lg font-semibold tracking-tight">
          <Logo /> Legis
        </div>
        <div className="max-w-md relative z-10">
          <p className="font-law text-3xl leading-snug">
            A lei como ela está <em className="not-italic text-[#ffd54a]">hoje</em>, conferida na fonte oficial.
          </p>
          <ul className="mt-8 space-y-3 text-white/80 text-sm">
            <li>• Texto compilado do Planalto, sem a redação revogada</li>
            <li>• Prazos destacados em negrito</li>
            <li>• Jurisprudência do STJ ao lado de cada artigo</li>
            <li>• Biblioteca de conceitos a um clique</li>
          </ul>
        </div>
        <p className="text-xs text-white/50">Acesso restrito a usuários cadastrados.</p>
        <div aria-hidden className="absolute -right-24 -bottom-24 size-[28rem] rounded-full bg-[#1f4fd1]/40 blur-3xl" />
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10 text-lg font-semibold">
            <Logo /> Legis
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-muted text-sm mt-1 mb-8">Use o login e a senha fornecidos pelo administrador.</p>
          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#1f4fd1" />
      <path d="M20 16h7v26h17v6H20z" fill="#fff" />
      <circle cx="44" cy="22" r="5" fill="#ffd54a" />
    </svg>
  );
}
