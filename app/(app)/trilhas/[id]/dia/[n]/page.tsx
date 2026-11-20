import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getNormCategories, getTerms } from "@/lib/data";
import { buildMatcher } from "@/lib/text/terms";
import { getDayContent, getTrail, getTrailDays } from "@/lib/trilhas";
import { FRASES_INICIO, pick } from "@/lib/trilhas/frases";
import { rangeLabel } from "@/lib/trilhas/plan";
import { GlossaryLayer } from "@/components/glossary-layer";
import { ReaderControls } from "@/components/reader-controls";
import { DayText } from "@/components/trilhas/day-text";
import { ReadingProgress } from "@/components/trilhas/reading-progress";
import { Bar, CompleteDay } from "@/components/trilhas/celebration";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leitura do dia" };

export default async function DiaPage({ params }: { params: Promise<{ id: string; n: string }> }) {
  const me = await requireUser();
  const p = await params;
  const id = Number(p.id);
  const n = Number(p.n);
  const trail = Number.isInteger(id) ? await getTrail(me.id, id) : null;
  if (!trail || !Number.isInteger(n)) notFound();
  const days = await getTrailDays(trail.id);
  const day = days.find((d) => d.day_no === n);
  if (!day) notFound();
  const prev = days.find((d) => d.day_no === n - 1);
  const next = days.find((d) => d.day_no === n + 1);
  const pct = trail.total_days ? (trail.done_days / trail.total_days) * 100 : 0;
  const review = day.kind === "revisao";

  const [parts, terms, cats] = review
    ? [[], [], []]
    : await Promise.all([getDayContent(day), getTerms(), Promise.all([...new Set(day.segments.map((s) => s.norm_id))].map(getNormCategories))]);
  const matcher = buildMatcher(terms, cats.flat().map((c) => c.id));
  const reviewed = review ? days.filter((d) => day.review_of.includes(d.day_no)) : [];

  return (
    <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-6 sm:py-10">
      {!review && <GlossaryLayer />}
      <ReadingProgress targetId="lei" />

      <nav className="flex items-center justify-between gap-3 text-sm">
        <Link href={`/trilhas/${trail.id}`} className="text-muted hover:text-ink truncate">
          ← {trail.title}
        </Link>
        <span className="shrink-0 text-xs text-muted tabular-nums">
          {trail.done_days}/{trail.total_days} dias
        </span>
      </nav>
      <Bar pct={pct} className="mt-2 !h-1.5" />

      <header className="mt-6">
        <p className="text-sm font-medium text-accent">
          Dia {day.day_no} de {trail.total_days} · ≈ {day.est_minutes} min{!review && ` · ${day.articles} ${day.articles === 1 ? "artigo" : "artigos"}`}
        </p>
        <h1 className="mt-1 text-2xl sm:text-[2rem] font-semibold tracking-tight leading-tight">
          {review ? "Dia de revisão" : day.segments.map((s) => `${s.norm_title} · ${rangeLabel(s)}`).join(" + ")}
        </h1>
        {!day.completed_at && <p className="mt-2 text-ink-2">{pick(FRASES_INICIO, day.day_no + trail.id)}</p>}
      </header>

      {review ? (
        <section id="lei" className="mt-8 space-y-4">
          <p className="text-ink-2 leading-relaxed max-w-[70ch]">
            Hoje o objetivo é fixar. Releia com calma os pontos que você marcou, os prazos em negrito e os artigos que geraram dúvida nos últimos dias. Abra
            cada trecho abaixo e passe os olhos pelo texto; se quiser, use as <Link href="/notas" className="text-accent underline underline-offset-2">suas notas</Link> como roteiro.
          </p>
          <ul className="space-y-2">
            {reviewed.map((d) => (
              <li key={d.id}>
                <Link href={`/trilhas/${trail.id}/dia/${d.day_no}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 hover:border-accent/40 hover:shadow-[var(--shadow)] transition">
                  <span className={`size-9 shrink-0 rounded-full grid place-items-center text-sm font-bold ${d.completed_at ? "bg-ok text-white" : "bg-surface-2 text-ink-2"}`}>
                    {d.completed_at ? "✓" : d.day_no}
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block text-xs text-muted">Dia {d.day_no}</span>
                    {d.segments.map((s, i) => (
                      <span key={i} className="block">
                        <strong className="font-medium">{s.norm_title}</strong> · {rangeLabel(s)}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <div className="sticky top-16 z-20 -mx-4 sm:mx-0 mt-6 bg-bg/90 backdrop-blur-md border-b border-line px-4 sm:px-0">
            <div className="flex items-center gap-2 py-2 min-w-0">
              <span className="text-xs text-muted truncate">Toque num rótulo para abrir o dispositivo na lei completa (marca-texto e notas).</span>
              <ReaderControls />
            </div>
          </div>
          <article id="lei" className="lei mt-6 max-w-[72ch]">
            {parts.map(({ segment, nodes }, i) => (
              <section key={i} className={i > 0 ? "mt-12" : ""}>
                {parts.length > 1 && (
                  <p className="font-sans text-xs font-semibold uppercase tracking-wider text-accent mb-2">
                    {segment.norm_title} · {rangeLabel(segment)}
                  </p>
                )}
                {nodes.length ? (
                  <DayText nodes={nodes} matcher={matcher} slug={segment.slug ?? ""} />
                ) : (
                  <p className="font-sans text-sm text-muted">
                    Este trecho não foi encontrado no texto atual da norma (a lei pode ter sido alterada).{" "}
                    <Link href={`/lei/${segment.slug}`} className="text-accent underline">Abrir a norma</Link>
                  </p>
                )}
              </section>
            ))}
          </article>
        </>
      )}

      <div className="mt-14 rounded-3xl border border-line bg-surface p-6 sm:p-8 text-center">
        <p className="text-sm text-muted mb-4">{day.completed_at ? "Você já concluiu este dia." : "Terminou? Registre e veja seu progresso."}</p>
        <CompleteDay trailId={trail.id} dayNo={day.day_no} done={!!day.completed_at} kind={day.kind} />
        <div className="mt-6 flex justify-between text-sm">
          {prev ? (
            <Link href={`/trilhas/${trail.id}/dia/${prev.day_no}`} className="text-muted hover:text-ink">
              ← Dia {prev.day_no}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/trilhas/${trail.id}/dia/${next.day_no}`} className="text-muted hover:text-ink">
              Dia {next.day_no} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
