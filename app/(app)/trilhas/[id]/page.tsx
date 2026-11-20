import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTrail, getTrailDays, getUserStats, type TrailDay } from "@/lib/trilhas";
import { FRASES_INICIO, pick, todaySeed } from "@/lib/trilhas/frases";
import { PACES, rangeLabel } from "@/lib/trilhas/plan";
import { Bar } from "@/components/trilhas/celebration";
import { deleteTrailAction } from "../actions";
import { ScrollTop } from "@/components/trilhas/scroll-top";
import "@/components/trilhas/trilhas.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trilha" };

const nf = new Intl.NumberFormat("pt-BR");

export default async function TrilhaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nova?: string }> }) {
  const me = await requireUser();
  const id = Number((await params).id);
  const { nova } = await searchParams;
  const trail = Number.isInteger(id) ? await getTrail(me.id, id) : null;
  if (!trail) notFound();
  const [days, stats] = await Promise.all([getTrailDays(trail.id), getUserStats(me.id)]);
  const pct = trail.total_days ? (trail.done_days / trail.total_days) * 100 : 0;
  const totalMin = days.reduce((a, d) => a + d.est_minutes, 0);
  const left = trail.total_days - trail.done_days;
  const milestoneAt = new Map<number, number>();
  for (const m of [25, 50, 75]) {
    const n = Math.ceil((m / 100) * trail.total_days);
    if (n > 0 && n < trail.total_days) milestoneAt.set(n, m);
  }

  return (
    <main className="mx-auto max-w-[900px] px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/trilhas" className="text-sm text-muted hover:text-ink">
        ← Trilhas
      </Link>

      {nova && <ScrollTop />}
      {nova && (
        <p className="mt-4 rounded-2xl bg-ok/10 text-ok px-4 py-3 text-sm font-medium">
          Trilha criada! São {trail.total_days} dias de cerca de {trail.minutes_per_day} minutos. O primeiro passo é o mais importante. 🚀
        </p>
      )}

      <header className="mt-4 rounded-[28px] bg-[var(--navy)] text-white p-5 sm:p-7 relative overflow-hidden">
        <div className="pointer-events-none absolute -bottom-24 -right-10 size-72 rounded-full bg-[var(--gold)] opacity-20 blur-[80px]" aria-hidden />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-white/60">
            {trail.minutes_per_day} min/dia · ritmo {PACES[trail.pace]?.label.toLowerCase() ?? trail.pace}
            {trail.review_every ? ` · revisão a cada ${trail.review_every} dias` : ""}
            {trail.weekly_quiz ? " · questionário semanal" : ""}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">{trail.title}</h1>
          <p className="mt-1 text-sm text-white/70">{trail.norms}</p>

          <div className="mt-6 flex items-end justify-between gap-3">
            <p className="text-4xl font-semibold tabular-nums">
              {Math.round(pct)}
              <span className="text-xl text-white/60">%</span>
            </p>
            <p className="text-sm text-white/70 text-right tabular-nums">
              {trail.done_days} de {trail.total_days} dias
              <span className="block">
                {nf.format(trail.done_words)} de {nf.format(trail.total_words)} palavras
              </span>
            </p>
          </div>
          <Bar pct={pct} animate className="mt-3 !bg-white/15" />

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-sm text-white/80 max-w-md">
              {trail.status === "concluida"
                ? "Trilha concluída. Você pode reler qualquer dia quando quiser."
                : stats.readToday
                  ? `Meta de hoje cumprida. Faltam ${left} ${left === 1 ? "dia" : "dias"}; se quiser, adiante o próximo.`
                  : pick(FRASES_INICIO, todaySeed() + trail.id)}
            </p>
            {trail.next_day && (
              <Link
                href={`/trilhas/${trail.id}/dia/${trail.next_day}`}
                className="shrink-0 h-12 px-6 rounded-2xl bg-[var(--gold)] text-[#1b1a17] font-semibold grid place-items-center hover:brightness-105 transition"
              >
                {trail.done_days === 0 ? "Começar o dia 1" : `Continuar: dia ${trail.next_day}`}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <Mini v={`${stats.streak} 🔥`} l="sequência atual" />
        <Mini v={fmtMin(totalMin)} l="tempo total estimado" />
        <Mini v={`${left}`} l={left === 1 ? "dia restante" : "dias restantes"} />
      </div>

      <ol className="mt-10 relative">
        <span className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-line" aria-hidden />
        {days.map((d) => (
          <DayItem key={d.id} d={d} trailId={trail.id} current={d.day_no === trail.next_day} milestone={milestoneAt.get(d.day_no)} />
        ))}
        <li className="relative flex items-center gap-4 pt-2">
          <span className={`relative z-[1] size-12 shrink-0 rounded-full grid place-items-center text-2xl ${trail.status === "concluida" ? "bg-[var(--gold)]" : "bg-surface-2 grayscale opacity-60"}`}>🏁</span>
          <span className="text-sm text-muted">{trail.status === "concluida" ? "Linha de chegada alcançada!" : "Linha de chegada"}</span>
        </li>
      </ol>

      <details className="mt-12 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink w-fit">Excluir esta trilha</summary>
        <form action={deleteTrailAction} className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <input type="hidden" name="id" value={trail.id} />
          <p className="text-ink-2 flex-1 min-w-60">O plano e o progresso desta trilha serão apagados. O histórico de leituras continua contando nas suas estatísticas.</p>
          <button className="h-9 px-4 rounded-lg border border-line text-err hover:bg-surface-2">Excluir definitivamente</button>
        </form>
      </details>
    </main>
  );
}

function DayItem({ d, trailId, current, milestone }: { d: TrailDay; trailId: number; current: boolean; milestone?: number }) {
  const done = !!d.completed_at;
  const review = d.kind === "revisao";
  const quiz = d.kind === "questionario";
  return (
    <>
      <li className="relative">
        <Link
          href={`/trilhas/${trailId}/dia/${d.day_no}`}
          className="group flex items-center gap-4 py-2"
          aria-current={current ? "step" : undefined}
        >
          <span
            className={`relative z-[1] size-12 shrink-0 rounded-full grid place-items-center text-sm font-bold tabular-nums transition ring-4 ring-bg ${
              done
                ? "bg-ok text-white"
                : current
                  ? "bg-accent text-accent-ink trilha-atual"
                  : quiz
                    ? "bg-[color-mix(in_srgb,#7c3aed_14%,transparent)] text-[#7c3aed] border border-dashed border-[#7c3aed]/60"
                    : review
                    ? "bg-[var(--prazo-bg)] text-[var(--warn)] border border-dashed border-[var(--gold)]"
                    : "bg-surface border-2 border-line text-ink-2 group-hover:border-accent/60"
            }`}
          >
            {done ? "✓" : quiz ? "?" : review ? "↺" : d.day_no}
          </span>
          <span
            className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 transition ${
              current ? "border-accent bg-accent-soft/50 shadow-[var(--shadow)]" : "border-line bg-surface group-hover:border-accent/40"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Dia {d.day_no}
                {review ? " · revisão" : quiz ? " · questionário" : ""}
                {current ? <span className="ml-2 normal-case tracking-normal text-accent">← você está aqui</span> : null}
              </span>
              <span className="text-xs text-muted tabular-nums shrink-0">≈ {d.est_minutes} min</span>
            </span>
            <span className="mt-1 block text-sm leading-snug">
              {quiz
                ? `Questionário da semana: 10 questões dos dias ${d.review_of[0]} a ${d.review_of[d.review_of.length - 1]}`
                : review
                ? `Revisão dos dias ${d.review_of[0]} a ${d.review_of[d.review_of.length - 1]}`
                : d.segments.map((s, i) => (
                    <span key={i} className="block">
                      <strong className="font-medium">{s.norm_title}</strong> · {rangeLabel(s)}
                    </span>
                  ))}
            </span>
            {!review && !quiz && <span className="mt-0.5 block text-xs text-muted">{d.articles} {d.articles === 1 ? "artigo" : "artigos"}</span>}
          </span>
        </Link>
      </li>
      {milestone && (
        <li className="relative flex items-center gap-4 py-1.5">
          <span className="relative z-[1] w-12 grid place-items-center">
            <span className="rounded-full bg-[var(--gold)] text-[#1b1a17] text-[11px] font-bold px-2 py-0.5">{milestone}%</span>
          </span>
          <span className="text-xs text-muted">Marco de {milestone}% da trilha</span>
        </li>
      )}
    </>
  );
}

function Mini({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface py-3">
      <p className="text-lg font-semibold tabular-nums">{v}</p>
      <p className="text-[11px] text-muted">{l}</p>
    </div>
  );
}

function fmtMin(m: number) {
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
}
