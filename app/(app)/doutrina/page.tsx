import Link from "next/link";
import { getTerms } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Biblioteca doutrinária" };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function DoutrinaPage({ searchParams }: { searchParams: Promise<{ q?: string; area?: string }> }) {
  const { q = "", area = "" } = await searchParams;
  const all = await getTerms();
  const areas = [...new Set(all.map((t) => t.area))].sort();
  const nq = norm(q.trim());
  const terms = all.filter(
    (t) =>
      (!area || t.area === area) &&
      (!nq || norm(`${t.term} ${t.aliases.join(" ")} ${t.short_definition} ${t.definition}`).includes(nq)),
  );
  // agrupa por letra inicial
  const groups = new Map<string, typeof terms>();
  for (const t of terms) {
    const L = norm(t.term)[0]?.toUpperCase() ?? "#";
    groups.set(L, [...(groups.get(L) ?? []), t]);
  }
  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Biblioteca doutrinária</h1>
      <p className="mt-2 text-ink-2 max-w-2xl">
        Conceitos fundamentais explicados de forma direta, com a base legal. Enquanto lê uma lei, clique num termo sublinhado ou
        selecione uma palavra para abrir o verbete.
      </p>

      <form className="mt-6 flex flex-col sm:flex-row gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={`Buscar entre ${all.length} conceitos…`}
          className="flex-1 h-11 rounded-xl border border-line bg-surface px-4 outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        {area && <input type="hidden" name="area" value={area} />}
        <button className="h-11 px-5 rounded-xl bg-accent text-accent-ink font-medium">Buscar</button>
      </form>

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <AreaChip href={`/doutrina${q ? `?q=${encodeURIComponent(q)}` : ""}`} active={!area}>
          Todas
        </AreaChip>
        {areas.map((a) => (
          <AreaChip key={a} href={`/doutrina?area=${encodeURIComponent(a)}${q ? `&q=${encodeURIComponent(q)}` : ""}`} active={a === area}>
            {a}
          </AreaChip>
        ))}
      </div>

      {terms.length === 0 ? (
        <p className="mt-10 text-ink-2">Nenhum conceito encontrado.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {[...groups.entries()].map(([L, list]) => (
            <section key={L}>
              <h2 className="text-sm font-semibold text-muted border-b border-line pb-2">{L}</h2>
              <ul className="mt-3 grid sm:grid-cols-2 gap-3">
                {list.map((t) => (
                  <li key={t.id}>
                    <Link href={`/doutrina/${t.slug}`} className="block h-full rounded-2xl border border-line bg-surface p-4 hover:border-accent/40 hover:shadow-[var(--shadow)] transition">
                      <p className="text-[11px] uppercase tracking-wider text-muted">{t.area}</p>
                      <p className="mt-0.5 font-semibold">{t.term}</p>
                      <p className="mt-1 text-sm text-ink-2 leading-relaxed line-clamp-3">{t.short_definition}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function AreaChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`shrink-0 h-8 px-3 rounded-full text-sm grid place-items-center border transition ${active ? "bg-ink text-bg border-ink" : "border-line bg-surface text-ink-2 hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}
