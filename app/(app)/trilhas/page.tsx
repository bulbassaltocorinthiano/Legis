import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BADGES, getTrails, getUserStats } from "@/lib/trilhas";
import { FRASES_INICIO, FRASES_RETOMADA, pick, todaySeed } from "@/lib/trilhas/frases";
import { Bar } from "@/components/trilhas/celebration";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trilhas de leitura" };

const nf = new Intl.NumberFormat("pt-BR");

export default async function TrilhasPage() {
  const me = await requireUser();
  const [trails, stats] = await Promise.all([getTrails(me.id), getUserStats(me.id)]);
  const active = trails.filter((t) => t.status === "ativa");
  const done = trails.filter((t) => t.status === "concluida");
  const phrase = stats.days > 0 && stats.streak === 0 ? pick(FRASES_RETOMADA, todaySeed()) : pick(FRASES_INICIO, todaySeed());
  const hours = Math.floor(stats.minutes / 60);

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Trilhas de leitura</h1>
          <p className="mt-2 text-ink-2 max-w-xl">Lei seca em doses diárias: você escolhe o tempo e as normas, o Legis divide a leitura em dias.</p>
        </div>
        <Link href="/trilhas/nova" className="h-11 px-5 rounded-xl bg-accent text-accent-ink font-medium grid place-items-center hover:brightness-110 transition">
          + Nova trilha
        </Link>
      </div>

      <section className="mt-8 relative overflow-hidden rounded-[28px] bg-[var(--navy)] text-white p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-[#7c3aed] opacity-40 blur-[80px]" aria-hidden />
        <div className="relative grid md:grid-cols-[minmax(0,1fr)_auto] gap-6 items-center">
          <div>
            <p className="text-sm text-white/60">{stats.readToday ? "Meta de hoje cumprida ✓" : "Leitura de hoje pendente"}</p>
            <p className="mt-1 font-law text-xl sm:text-2xl leading-snug max-w-xl">“{phrase}”</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat v={`${stats.streak}`} l={stats.streak === 1 ? "dia seguido" : "dias seguidos"} icon="🔥" />
            <Stat v={nf.format(stats.articles)} l="artigos lidos" icon="📖" />
            <Stat v={hours ? `${hours}h${String(stats.minutes % 60).padStart(2, "0")}` : `${stats.minutes} min`} l="de leitura" icon="⏱️" />
          </div>
        </div>
      </section>

      {trails.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-surface p-8 sm:p-10 text-center">
          <p className="text-4xl">🧭</p>
          <p className="mt-3 font-medium text-lg">Você ainda não tem trilhas.</p>
          <p className="mt-2 text-sm text-ink-2 max-w-md mx-auto">
            Diga quanto tempo tem por dia e quais leis quer dominar. Em segundos você recebe um plano com o trecho exato de cada dia.
          </p>
          <Link href="/trilhas/nova" className="mt-5 inline-grid h-11 px-5 rounded-xl bg-accent text-accent-ink font-medium place-items-center">
            Montar minha primeira trilha
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
          <div className="space-y-8 min-w-0">
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Em andamento</h2>
                <ul className="mt-3 space-y-3">{active.map((t) => <TrailItem key={t.id} t={t} />)}</ul>
              </section>
            )}
            {done.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Concluídas</h2>
                <ul className="mt-3 space-y-3">{done.map((t) => <TrailItem key={t.id} t={t} />)}</ul>
              </section>
            )}
          </div>
          <Badges stats={stats} />
        </div>
      )}
      {trails.length === 0 && (
        <div className="mt-8">
          <Badges stats={stats} />
        </div>
      )}
    </main>
  );
}

function TrailItem({ t }: { t: Awaited<ReturnType<typeof getTrails>>[number] }) {
  const pct = t.total_days ? (t.done_days / t.total_days) * 100 : 0;
  return (
    <li>
      <Link href={`/trilhas/${t.id}`} className="block rounded-2xl border border-line bg-surface p-4 sm:p-5 hover:shadow-[var(--shadow)] hover:border-accent/40 transition">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold leading-snug">{t.title}</p>
            <p className="text-xs text-muted mt-0.5 line-clamp-1">{t.norms}</p>
          </div>
          {t.status === "concluida" ? (
            <span className="shrink-0 text-xs rounded-full bg-ok/10 text-ok px-2.5 py-1 font-medium">🎓 Concluída</span>
          ) : (
            <span className="shrink-0 text-xs rounded-full bg-accent-soft text-accent px-2.5 py-1 font-medium">{t.minutes_per_day} min/dia</span>
          )}
        </div>
        <Bar pct={pct} className="mt-4" />
        <div className="mt-2 flex justify-between text-xs text-muted tabular-nums">
          <span>
            {t.done_days}/{t.total_days} dias · {Math.round(pct)}%
          </span>
          {t.next_day && <span className="text-accent font-medium">Próximo: dia {t.next_day} →</span>}
        </div>
      </Link>
    </li>
  );
}

function Badges({ stats }: { stats: Awaited<ReturnType<typeof getUserStats>> }) {
  const got = BADGES.filter((b) => b.got(stats)).length;
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 lg:sticky lg:top-24">
      <h2 className="font-semibold flex items-center justify-between">
        Conquistas <span className="text-xs font-normal text-muted tabular-nums">{got}/{BADGES.length}</span>
      </h2>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {BADGES.map((b) => {
          const on = b.got(stats);
          return (
            <li key={b.id} title={b.desc} className={`rounded-2xl p-2.5 text-center ${on ? "bg-[var(--prazo-bg)]/60 ring-1 ring-[color-mix(in_srgb,var(--gold)_45%,transparent)]" : "bg-surface-2 opacity-55 grayscale"}`}>
              <span className="block text-2xl">{b.icon}</span>
              <span className="mt-1 block text-[11px] leading-tight font-medium">{b.title}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted">Melhor sequência: {stats.bestStreak} {stats.bestStreak === 1 ? "dia" : "dias"}.</p>
    </section>
  );
}

function Stat({ v, l, icon }: { v: string; l: string; icon: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] ring-1 ring-white/10 px-3 py-3 min-w-[92px]">
      <p className="text-xl font-semibold tabular-nums">
        <span className="text-base mr-0.5">{icon}</span>
        {v}
      </p>
      <p className="text-[11px] text-white/60">{l}</p>
    </div>
  );
}
