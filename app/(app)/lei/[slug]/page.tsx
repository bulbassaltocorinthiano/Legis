import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { getJurisCounts, getJurisForNorm, getNodes, getNorm, getNormCategories, getTerms, getUserHighlights, getUserNotes, type Juris, type NodeRow, type Note } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { MarkupLayer } from "@/components/markup-layer";
import { NoteCards } from "@/components/note-cards";
import { buildMatcher } from "@/lib/text/terms";
import { LawText } from "@/components/law-text";
import { ReaderControls } from "@/components/reader-controls";
import { GlossaryLayer } from "@/components/glossary-layer";
import { Toc, type TocItem } from "@/components/toc";
import { JurisList } from "@/components/juris-list";
import { formatDateTime } from "@/lib/format";
import { TrackVisit } from "@/components/recent-reads";
import { cobradoTitle, getCobrados, type SourceId } from "@/lib/cobrados";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const n = await getNorm((await params).slug);
  return { title: n ? (n.nickname ?? n.title) : "Lei" };
}

const STRUCT = new Set(["parte", "livro", "titulo", "subtitulo", "capitulo", "secao", "subsecao"]);

export default async function LeiPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { slug } = await params;
  const { aba } = await searchParams;
  const norm = await getNorm(slug);
  if (!norm) notFound();
  const juris = aba === "jurisprudencia";

  const me = await requireUser();
  const [nodes, cats, terms, counts, marks, notes] = await Promise.all([
    getNodes(norm.id),
    getNormCategories(norm.id),
    getTerms(),
    getJurisCounts(norm.id),
    getUserHighlights(me.id, norm.id),
    getUserNotes(me.id, norm.id),
  ]);
  const notesBy = new Map<string, Note[]>();
  for (const n of notes) notesBy.set(n.anchor, [...(notesBy.get(n.anchor) ?? []), n]);
  const jurisMap = juris ? await getJurisForNorm(norm.id) : new Map<string, Juris[]>();
  const totalJuris = [...counts.values()].reduce((a, b) => a + b, 0);
  const matcher = buildMatcher(terms, cats.map((c) => c.id));
  const cobrados = getCobrados(norm.key);

  const toc: TocItem[] = nodes
    .filter((n) => STRUCT.has(n.kind))
    .map((n) => ({ anchor: n.anchor, label: n.label ?? "", heading: n.heading ?? "", level: n.level, revoked: n.revoked }));

  // Agrupa nós por artigo para inserir a jurisprudência logo após cada artigo
  const lastOfArticle = new Set<number>();
  for (let i = 0; i < nodes.length; i++) {
    const cur = nodes[i].article_key;
    const next = nodes[i + 1];
    if (cur && (!next || next.article_key !== cur || next.kind === "artigo")) lastOfArticle.add(i);
  }

  let seen = new Set<string>();

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
      <GlossaryLayer />
      <TrackVisit slug={norm.slug} title={norm.nickname ?? norm.description} subtitle={norm.title} />
      <div className="leitor-grid grid gap-8 xl:gap-12">
        <Toc items={toc} />

        <main className="leitor-main min-w-0 py-6 sm:py-10">
          <nav className="text-sm text-muted flex flex-wrap gap-x-2">
            <Link href="/" className="hover:text-ink">
              Legislação
            </Link>
            {cats.slice(0, 2).map((c) => (
              <Fragment key={c.id}>
                <span>/</span>
                <Link href={`/area/${c.slug}`} className="hover:text-ink">
                  {c.title.replace(/^Maranhão: /, "")}
                </Link>
              </Fragment>
            ))}
          </nav>

          <header className="mt-3 max-w-[72ch]">
            <p className="text-sm font-medium text-accent">{norm.title}</p>
            <h1 className="mt-1 text-2xl sm:text-[2rem] font-semibold tracking-tight leading-tight">
              {norm.nickname ?? norm.description}
            </h1>
            {norm.ementa && <p className="mt-3 font-law text-ink-2 leading-relaxed">{norm.ementa}</p>}
            {norm.historical && (
              <p className="mt-3 text-sm rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-ink">
                <strong>Norma revogada.</strong> O Planalto mantém o texto tachado; ele é exibido aqui apenas para consulta histórica e
                aplicação a fatos e contratos regidos por ela.
              </p>
            )}
            {norm.note && <p className="mt-3 text-sm rounded-xl bg-[var(--prazo-bg)]/60 px-3 py-2 text-ink-2">{norm.note}</p>}
            <SourceLine norm={norm} />
          </header>

          {norm.status !== "ok" ? (
            <Unavailable status={norm.status} detail={norm.status_detail} />
          ) : (
            <>
              <div className="sticky top-16 z-30 -mx-4 sm:mx-0 mt-6 bg-bg/90 backdrop-blur-md border-b border-line px-4 sm:px-0">
                <div className="flex items-center gap-2 py-2 min-w-0">
                  <div role="tablist" className="flex gap-1 rounded-xl bg-surface-2 p-1 text-sm">
                    <Link
                      role="tab"
                      aria-selected={!juris}
                      href={`/lei/${norm.slug}`}
                      className={`px-3 sm:px-4 h-8 rounded-lg grid place-items-center transition ${!juris ? "bg-surface shadow-sm font-medium" : "text-ink-2 hover:text-ink"}`}
                    >
                      Texto
                    </Link>
                    <Link
                      role="tab"
                      aria-selected={juris}
                      href={`/lei/${norm.slug}?aba=jurisprudencia`}
                      className={`px-3 sm:px-4 h-8 rounded-lg flex items-center gap-1.5 transition ${juris ? "bg-surface shadow-sm font-medium" : "text-ink-2 hover:text-ink"}`}
                    >
                      <span className="hidden sm:inline">Jurisprudência</span>
                      <span className="sm:hidden">Julgados</span>
                      <span className="text-[11px] tabular-nums rounded-md bg-accent-soft text-accent px-1.5">{totalJuris}</span>
                    </Link>
                  </div>
                  <ReaderControls />
                </div>
              </div>

              <article id="lei" className="lei mt-6 max-w-[72ch]">
                {nodes.map((n, i) => {
                  if (n.kind === "artigo") seen = new Set();
                  const nodeEl = <NodeView n={n} matcher={matcher} seen={seen} jurisCount={n.kind === "artigo" && n.article_key ? (counts.get(n.article_key) ?? 0) : 0} slug={norm.slug} juris={juris} cobrado={n.kind === "artigo" && n.article_key ? cobrados.get(n.article_key) : undefined} />;
                  const myNotes = notesBy.get(n.anchor);
                  const el = (
                    <Fragment key={n.id}>
                      {nodeEl}
                      {myNotes && <NoteCards normId={norm.id} notes={myNotes} />}
                    </Fragment>
                  );
                  if (juris && lastOfArticle.has(i) && n.article_key) {
                    const list = jurisMap.get(n.article_key);
                    return (
                      <Fragment key={n.id}>
                        {el}
                        {list && list.length > 0 && <JurisList items={list} articleLabel={articleLabelFor(nodes, i)} />}
                      </Fragment>
                    );
                  }
                  return el;
                })}
              </article>
              <MarkupLayer normId={norm.id} initial={marks} />
            </>
          )}
        </main>

        <aside className="hidden xl:block py-10">
          <div className="sticky top-24 text-xs text-muted space-y-3">
            <p className="font-semibold text-ink-2 uppercase tracking-wider text-[11px]">Legenda</p>
            <p>
              <strong className="font-extrabold text-[var(--prazo)] bg-[linear-gradient(transparent_62%,var(--prazo-bg)_62%)]">prazo</strong> — destaque automático de prazos
            </p>
            <p>
              <span className="underline decoration-dotted decoration-accent/60 underline-offset-4">termo</span> — clique para ver o conceito
            </p>
            <p className="flex items-start gap-1.5">
              <span className="cobrado-marca" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
                </svg>
              </span>
              <span>
                artigo frequente em provas ·{" "}
                <Link href="/cobrados" className="underline underline-offset-2 hover:text-ink">
                  fontes
                </Link>
              </span>
            </p>
            <p>Selecione qualquer palavra para consultá-la na biblioteca doutrinária.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function articleLabelFor(nodes: NodeRow[], i: number) {
  const key = nodes[i].article_key;
  for (let j = i; j >= 0; j--) if (nodes[j].kind === "artigo" && nodes[j].article_key === key) return nodes[j].label ?? "";
  return "";
}

function NodeView({
  n,
  matcher,
  seen,
  jurisCount,
  slug,
  juris,
  cobrado,
}: {
  n: NodeRow;
  matcher: ReturnType<typeof buildMatcher>;
  seen: Set<string>;
  jurisCount: number;
  slug: string;
  juris: boolean;
  cobrado?: SourceId[];
}) {
  const notes = n.notes?.length ? (
    <>
      {" "}
      {n.notes.map((t, i) => (
        <span key={i} className="nota">
          {t}{" "}
        </span>
      ))}
    </>
  ) : null;

  if (STRUCT.has(n.kind)) {
    return (
      <h2 id={n.anchor} className={`titulo-estrutura ${n.revoked ? "revogado" : ""}`}>
        {n.label && <span className="block text-[0.72em] font-semibold tracking-[0.12em] uppercase text-muted">{n.label}</span>}
        {n.heading && <span className="block mt-1 text-[0.98em] font-semibold text-ink">{n.heading}</span>}
        {notes && <span className="block">{notes}</span>}
      </h2>
    );
  }
  if (n.kind === "epigrafe" || n.kind === "ementa") return null;
  if (n.kind === "rubrica") {
    return (
      <p className="rubrica">
        {n.text}
        {notes}
      </p>
    );
  }
  if (n.kind === "preambulo") {
    return <p className="dispositivo text-ink-2 italic">{n.text}</p>;
  }
  if (n.kind === "fecho") {
    return <p className="dispositivo mt-10 text-sm text-muted font-sans">{n.text}</p>;
  }

  const indent = n.kind === "artigo" ? 0 : Math.min(n.level, 4);
  const cls = ["dispositivo", n.kind, n.revoked ? "revogado" : "", n.kind === "pena" ? "pena" : "", cobrado ? "cobrado" : ""].join(" ");
  return (
    <p id={n.anchor} className={cls} style={indent ? { paddingLeft: `${indent * 1.25}rem` } : undefined}>
      {n.label && (
        <a href={`#${n.anchor}`} className="rotulo hover:text-accent">
          {n.kind === "pena" ? "Pena –" : n.kind === "inciso" ? `${n.label} –` : n.label}
        </a>
      )}
      {cobrado && (
        <Link href={`/cobrados#${slug}`} className="cobrado-marca no-print" title={cobradoTitle(cobrado)} aria-label={cobradoTitle(cobrado)}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
          </svg>
        </Link>
      )}{" "}
      {n.revoked && !n.text ? (
        <span className="italic">(revogado)</span>
      ) : (
        <span data-hl={n.anchor}>
          <LawText text={n.text} matcher={matcher} seen={seen} />
        </span>
      )}
      {notes}
      {jurisCount > 0 && !juris && (
        <Link
          href={`/lei/${slug}?aba=jurisprudencia#${n.anchor}`}
          className="no-print ml-1.5 inline-flex items-center gap-1 align-[2px] rounded-md bg-accent-soft text-accent px-1.5 py-px font-sans text-[11px] font-medium hover:bg-accent hover:text-accent-ink transition"
          title={`${jurisCount} julgado(s) do STJ vinculado(s) a este artigo`}
        >
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0L7 7Zm10 0-3 7a3 3 0 0 0 6 0l-3-7Z" />
          </svg>
          {jurisCount}
        </Link>
      )}
    </p>
  );
}

function SourceLine({ norm }: { norm: { source_url: string | null; checked_at: string | null; changed_at: string | null; status: string } }) {
  if (!norm.source_url) return null;
  return (
    <p className="mt-4 text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-ok" />
        Fonte oficial:{" "}
        <a href={norm.source_url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
          Planalto (texto compilado)
        </a>
      </span>
      {norm.checked_at && <span>conferido em {formatDateTime(norm.checked_at)}</span>}
      {norm.changed_at && <span>texto carregado/alterado em {formatDateTime(norm.changed_at)}</span>}
    </p>
  );
}

function Unavailable({ status, detail }: { status: string; detail: string | null }) {
  return (
    <div className="mt-10 max-w-[72ch] rounded-2xl border border-dashed border-line bg-surface p-6">
      <p className="font-medium">Texto ainda não disponível</p>
      <p className="mt-2 text-sm text-ink-2">
        {status === "unsupported"
          ? "Esta norma vem de uma fonte oficial que ainda não foi integrada ao robô de atualização. Para não exibir texto sem garantia de atualidade, ela só aparecerá quando a fonte oficial estiver conectada."
          : status === "pending"
            ? "A norma está na fila do robô de atualização."
            : (detail ?? "Não foi possível localizar o texto oficial automaticamente.")}
      </p>
    </div>
  );
}
