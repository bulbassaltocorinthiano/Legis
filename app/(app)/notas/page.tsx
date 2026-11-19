import Link from "next/link";
import { parseDbTime } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getAllUserNotes } from "@/lib/data";
import { NoteIcon, MarkerIcon } from "@/components/markup-layer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minhas notas" };

const when = (s: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Fortaleza" }).format(parseDbTime(s));

export default async function NotasPage() {
  const me = await requireUser();
  const { notes, marks } = await getAllUserNotes(me.id);
  const byNorm = new Map<string, typeof notes>();
  for (const n of notes) byNorm.set(n.slug, [...(byNorm.get(n.slug) ?? []), n]);

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Minhas notas</h1>
      <p className="mt-2 text-ink-2">Suas anotações e marcações ficam salvas na sua conta e só você pode vê-las.</p>

      {notes.length === 0 && marks.length === 0 && (
        <div className="mt-10 rounded-3xl border border-dashed border-line bg-surface p-8 text-center">
          <p className="font-medium">Você ainda não tem notas nem marcações.</p>
          <p className="mt-2 text-sm text-ink-2 max-w-md mx-auto">
            Abra qualquer lei e use a barra no rodapé: <strong>Marca-texto</strong> para destacar, <strong>Borracha</strong> para apagar e{" "}
            <strong>Nota</strong> para anotar um dispositivo. Também dá para selecionar um trecho e escolher a ação.
          </p>
        </div>
      )}

      <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8">
        <div className="space-y-8 min-w-0">
          {[...byNorm.entries()].map(([slug, list]) => (
            <section key={slug}>
              <h2 className="font-semibold">
                <Link href={`/lei/${slug}`} className="hover:text-accent">
                  {list[0].nickname ?? list[0].title}
                </Link>{" "}
                <span className="text-sm font-normal text-muted">{list[0].nickname ? list[0].title : ""}</span>
              </h2>
              <ul className="mt-3 space-y-3">
                {list.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={`/lei/${slug}#${n.anchor}`}
                      className="block rounded-2xl border border-[color-mix(in_srgb,var(--gold)_45%,transparent)] bg-[var(--prazo-bg)]/50 px-4 py-3 hover:shadow-[var(--shadow)] transition"
                    >
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <NoteIcon className="size-3.5 text-[var(--warn)]" />
                        <span className="font-semibold text-ink-2">{n.label ?? n.anchor}</span>
                        <span>· {when(n.updated_at)}</span>
                      </span>
                      {n.quote && <span className="mt-2 block border-l-2 border-[var(--gold)] pl-2 font-law text-sm text-ink-2 line-clamp-2">{n.quote}</span>}
                      <span className="mt-1.5 block whitespace-pre-wrap text-sm leading-relaxed text-ink line-clamp-6">{n.body}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {marks.length > 0 && (
          <aside>
            <div className="rounded-3xl border border-line bg-surface p-5 lg:sticky lg:top-24">
              <h2 className="font-semibold flex items-center gap-2">
                <MarkerIcon className="size-5 text-[#e8a400]" /> Marcações
              </h2>
              <ul className="mt-3 space-y-2">
                {marks.map((m) => (
                  <li key={m.slug}>
                    <Link href={`/lei/${m.slug}`} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                      <span className="text-sm font-medium line-clamp-1">{m.nickname ?? m.title}</span>
                      <span className="text-xs tabular-nums rounded-md bg-[#ffd43b]/40 px-1.5 py-0.5">{m.n}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
