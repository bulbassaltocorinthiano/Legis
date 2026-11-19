import Link from "next/link";
import { notFound } from "next/navigation";
import { getTerm, searchLegislation } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getTerm((await params).slug);
  return { title: t?.term ?? "Verbete" };
}

export default async function TermPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = await getTerm((await params).slug);
  if (!t) notFound();
  const user = await getCurrentUser();
  const { hits } = await searchLegislation(`"${t.term}"`, 6);
  return (
    <main className="mx-auto max-w-[760px] px-4 sm:px-6 py-8 sm:py-12">
      <nav className="text-sm text-muted">
        <Link href="/doutrina" className="hover:text-ink">
          Biblioteca doutrinária
        </Link>{" "}
        / {t.area}
      </nav>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t.term}</h1>
      {t.aliases.length > 0 && <p className="mt-1 text-sm text-muted">Também: {t.aliases.join(", ")}</p>}
      <p className="mt-6 text-lg font-medium leading-relaxed">{t.short_definition}</p>
      <p className="mt-4 font-law text-[1.08rem] leading-relaxed text-ink-2">{t.definition}</p>
      {t.example && <p className="mt-4 rounded-xl bg-surface-2 p-4 text-sm">{t.example}</p>}
      {t.legal_basis && (
        <p className="mt-6 text-sm">
          <span className="text-muted">Base legal: </span>
          {t.legal_basis}
        </p>
      )}
      <p className="mt-8 text-xs text-muted">
        Atualizado em {formatDateTime(t.updated_at)}
        {t.updated_by ? ` · ${t.updated_by}` : ""}
        {user?.role === "admin" && (
          <>
            {" · "}
            <Link href={`/admin/doutrina?editar=${t.slug}`} className="text-accent hover:underline">
              editar verbete
            </Link>
          </>
        )}
      </p>
      {hits.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Onde aparece na legislação</h2>
          <ul className="mt-3 space-y-2">
            {hits.map((h, i) => (
              <li key={i}>
                <Link href={`/lei/${h.slug}#${h.anchor}`} className="block rounded-xl border border-line bg-surface px-4 py-3 hover:border-accent/40 text-sm">
                  <span className="text-muted">{h.nickname ?? h.title}</span> · <span className="font-medium">{h.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
