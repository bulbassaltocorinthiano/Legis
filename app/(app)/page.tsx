import Link from "next/link";
import { getCategories, getFeatured, getRecentlyChanged } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [cats, featured, recent] = await Promise.all([getCategories(), getFeatured(), getRecentlyChanged()]);
  const federal = cats.filter((c) => c.sphere === "federal");
  const estadual = cats.filter((c) => c.sphere !== "federal");
  return (
    <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 sm:py-12">
      <section className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Legislação atualizada</h1>
        <p className="mt-3 text-ink-2 text-base sm:text-lg leading-relaxed">
          Textos compilados direto da fonte oficial, com a redação vigente, prazos em destaque, jurisprudência por artigo e
          conceitos a um clique.
        </p>
      </section>

      <section className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {featured.map((n) => (
          <Link
            key={n.id}
            href={n.status === "ok" ? `/lei/${n.slug}` : "#"}
            className="group rounded-2xl border border-line bg-surface p-4 hover:border-accent/40 hover:shadow-[var(--shadow)] transition"
          >
            <p className="text-lg font-semibold tracking-tight group-hover:text-accent">{shortName(n.key, n.nickname)}</p>
            <p className="text-xs text-muted mt-1 line-clamp-1" title={n.title}>{FEATURED_NAMES[n.key] ?? n.nickname ?? n.title}</p>
          </Link>
        ))}
      </section>

      <div className="mt-12 grid lg:grid-cols-[1fr_320px] gap-10">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Legislação federal por área</h2>
          <ul className="mt-4 grid sm:grid-cols-2 gap-3">
            {federal.map((c) => (
              <AreaItem key={c.id} c={c} />
            ))}
          </ul>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted">Legislação do Maranhão</h2>
          <ul className="mt-4 grid sm:grid-cols-2 gap-3">
            {estadual.map((c) => (
              <AreaItem key={c.id} c={c} />
            ))}
          </ul>
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-semibold">Atualizado recentemente</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-muted mt-2">Nenhuma alteração detectada ainda.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {recent.map((n) => (
                  <li key={n.id}>
                    <Link href={`/lei/${n.slug}`} className="text-sm hover:text-accent">
                      <span className="font-medium">{n.nickname ?? n.title}</span>
                      <span className="block text-xs text-muted">{n.changed_at ? formatDateTime(n.changed_at) : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-2 leading-relaxed">
            <h2 className="font-semibold text-ink">Como ler</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <strong className="font-extrabold text-[var(--prazo)] bg-[linear-gradient(transparent_62%,var(--prazo-bg)_62%)]">Prazos</strong> aparecem em negrito.
              </li>
              <li>
                <span className="underline decoration-dotted decoration-accent/60 underline-offset-4">Termos sublinhados</span> abrem o
                conceito. Selecione qualquer palavra para consultá-la.
              </li>
              <li>Na aba Jurisprudência, cada artigo mostra os precedentes do STJ que o citam.</li>
              <li>
                Atalhos: <kbd className="text-xs border border-line rounded px-1">/</kbd> busca,{" "}
                <kbd className="text-xs border border-line rounded px-1">g</kbd> ir para artigo.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function shortName(key: string, nickname: string | null) {
  const map: Record<string, string> = {
    "CF-1988": "CF/88",
    "LEI-10406-2002": "CC",
    "LEI-13105-2015": "CPC",
    "DL-2848-1940": "CP",
    "DL-3689-1941": "CPP",
    "LEI-5172-1966": "CTN",
    "LEI-8078-1990": "CDC",
    "DL-5452-1943": "CLT",
  };
  return map[key] ?? nickname ?? key;
}

function AreaItem({ c }: { c: { id: number; slug: string; title: string; total: number; ok: number } }) {
  const pct = c.total ? Math.round((c.ok / c.total) * 100) : 0;
  return (
    <li>
      <Link
        href={`/area/${c.slug}`}
        className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-accent/40 hover:shadow-[var(--shadow)] transition"
      >
        <span className="size-9 shrink-0 rounded-xl bg-accent-soft text-accent text-sm font-semibold grid place-items-center tabular-nums">
          {c.id}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-snug">{c.title.replace(/^Maranhão: /, "")}</span>
          <span className="mt-1.5 flex items-center gap-2 text-xs text-muted">
            <span className="h-1 flex-1 max-w-28 rounded-full bg-surface-2 overflow-hidden">
              <span className="block h-full bg-ok" style={{ width: `${pct}%` }} />
            </span>
            {c.ok}/{c.total} disponíveis
          </span>
        </span>
      </Link>
    </li>
  );
}

const FEATURED_NAMES: Record<string, string> = {
  "CF-1988": "Constituição Federal",
  "LEI-10406-2002": "Código Civil",
  "LEI-13105-2015": "Processo Civil",
  "DL-2848-1940": "Código Penal",
  "DL-3689-1941": "Processo Penal",
  "LEI-5172-1966": "Código Tributário",
  "LEI-8078-1990": "Consumidor",
  "DL-5452-1943": "Leis do Trabalho",
};
