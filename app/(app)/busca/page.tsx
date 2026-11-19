import Link from "next/link";
import { searchLegislation, searchTerms } from "@/lib/data";
import { StatusDot } from "@/components/norm-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Busca" };

export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [{ norms, hits }, terms] = await Promise.all([searchLegislation(q), searchTerms(q, 4)]);
  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">
        {q ? (
          <>
            Resultados para <span className="text-accent">“{q}”</span>
          </>
        ) : (
          "Busca"
        )}
      </h1>
      {!q && <p className="mt-2 text-ink-2">Digite no campo de busca acima. Aceita aspas para frase exata e “-” para excluir palavras.</p>}

      <div className="mt-8 grid lg:grid-cols-[1fr_300px] gap-10">
        <div>
          {norms.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Normas</h2>
              <ul className="mt-3 space-y-2">
                {norms.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.status === "ok" ? `/lei/${n.slug}` : `/busca?q=${encodeURIComponent(q)}`}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:border-accent/40"
                    >
                      <StatusDot status={n.status} />
                      <span className="min-w-0">
                        <span className="block font-medium">{n.nickname ?? n.description}</span>
                        <span className="block text-xs text-muted">{n.title}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {q && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Dispositivos ({hits.length})</h2>
              {hits.length === 0 ? (
                <p className="mt-3 text-ink-2">Nenhum dispositivo vigente encontrado.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {hits.map((h, i) => (
                    <li key={i}>
                      <Link href={`/lei/${h.slug}#${h.anchor}`} className="block rounded-xl border border-line bg-surface px-4 py-3 hover:border-accent/40">
                        <p className="text-xs text-muted">
                          {h.nickname ?? h.title} · <span className="font-medium text-ink-2">{[h.kind !== "artigo" ? h.art_label : null, h.label].filter(Boolean).join(" · ") || "trecho"}</span>
                        </p>
                        <p className="mt-1 font-law leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeSnippet(h.snippet) }} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
        {terms.length > 0 && (
          <aside>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Na doutrina</h2>
            <ul className="mt-3 space-y-2">
              {terms.map((t) => (
                <li key={t.id}>
                  <Link href={`/doutrina/${t.slug}`} className="block rounded-xl border border-line bg-surface px-4 py-3 hover:border-accent/40">
                    <p className="font-medium">{t.term}</p>
                    <p className="text-sm text-ink-2 line-clamp-2">{t.short_definition}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </main>
  );
}

// ts_headline devolve texto puro com <mark>; escapamos tudo e reabrimos só o <mark>.
function sanitizeSnippet(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}
