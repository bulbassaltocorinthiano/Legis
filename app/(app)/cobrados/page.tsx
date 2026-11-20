import Link from "next/link";
import { loadCatalog, formalTitle } from "@/lib/catalog";
import { COBRADOS } from "@/lib/cobrados/data";
import { SOURCES, expandArticles, type SourceId } from "@/lib/cobrados";

export const metadata = { title: "Artigos mais cobrados" };

function label(spec: string) {
  const [a, b] = spec.includes("..") ? spec.split("..") : /^\d+-\d+$/.test(spec) ? spec.split("-") : [spec];
  const fmt = (s: string) => s.replace(/^(\d+)/, (n) => (Number(n) < 10 ? `${n}º` : Number(n).toLocaleString("pt-BR")));
  return b ? `arts. ${fmt(a)} a ${fmt(b)}` : `art. ${fmt(a)}`;
}

export default function CobradosPage() {
  const { norms } = loadCatalog();
  const byKey = new Map(norms.map((n) => [n.key, n]));
  const ids = Object.keys(SOURCES) as SourceId[];
  return (
    <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Artigos mais cobrados em provas</h1>
      <p className="mt-2 text-ink-2 max-w-2xl">
        No leitor, estes artigos levam uma pequena estrela dourada ao lado do número. A marca indica frequência em provas de concursos e
        do Exame de Ordem, não importância jurídica. Você pode desligá-la nas opções de leitura.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Bases da lista</h2>
        <ul className="mt-3 space-y-3">
          {ids.map((id) => {
            const s = SOURCES[id];
            return (
              <li key={id} className="rounded-xl border border-line bg-surface p-4 text-sm">
                <p className="font-medium">
                  {"url" in s && s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-accent">
                      {s.title}
                    </a>
                  ) : (
                    s.title
                  )}
                </p>
                <p className="mt-1 text-ink-2">{s.detail}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10 space-y-8">
        {Object.entries(COBRADOS).map(([key, entries]) => {
          const n = byKey.get(key);
          if (!n) return null;
          return (
            <div key={key} id={n.slug} className="scroll-mt-24">
              <h2 className="text-lg font-semibold tracking-tight">
                <Link href={`/lei/${n.slug}`} className="hover:text-accent">
                  {n.nickname ?? n.description}
                </Link>{" "}
                <span className="text-sm font-normal text-muted">{formalTitle(n)}</span>
              </h2>
              <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
                {entries.map(([spec, src]) => (
                  <li key={spec}>
                    <Link
                      href={`/lei/${n.slug}#art${expandArticles(spec)[0].toLowerCase()}`}
                      title={src.map((s) => SOURCES[s].title).join(" · ")}
                      className={`inline-flex rounded-lg border px-2 py-0.5 hover:border-accent hover:text-accent ${src.every((s) => s === "curadoria") ? "border-dashed border-line text-ink-2" : "border-line bg-surface"}`}
                    >
                      {label(spec)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
      <p className="mt-10 text-xs text-muted">Contorno tracejado: artigo incluído só pela curadoria Legis, sem levantamento publicado.</p>
    </main>
  );
}
