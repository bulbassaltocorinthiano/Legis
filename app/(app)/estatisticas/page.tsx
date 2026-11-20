import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getReadingStats } from "@/lib/estatisticas";
import { getUserStats } from "@/lib/trilhas";
import { relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estatísticas de leitura" };

const nf = new Intl.NumberFormat("pt-BR");
const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

function fmtDur(s: number) {
  const m = Math.round(s / 60);
  if (m < 1) return s > 0 ? "< 1 min" : "0 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
}

export default async function EstatisticasPage() {
  const me = await requireUser();
  const [st, trail] = await Promise.all([getReadingStats(me.id), getUserStats(me.id)]);
  const t = st.totals;
  const avg = t.days ? t.seconds / t.days : 0;
  const empty = t.seconds === 0 && t.articles === 0 && trail.days === 0;

  // últimos 30 dias, preenchendo dias sem leitura
  const byDay = new Map(st.daily.map((d) => [d.day, d.seconds]));
  const days: { key: string; label: string; min: number }[] = [];
  const fmtKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" });
  const fmtLabel = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", day: "numeric", month: "short" });
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = fmtKey.format(d);
    days.push({ key, label: fmtLabel.format(d), min: (byDay.get(key) ?? 0) / 60 });
  }
  const hours = Array.from({ length: 24 }, (_, h) => (st.hours.find((x) => x.hour === h)?.seconds ?? 0) / 60);
  const peakHour = hours.some((v) => v > 0) ? hours.indexOf(Math.max(...hours)) : null;
  const peakDow = st.weekdays.length ? st.weekdays.reduce((a, b) => (b.seconds > a.seconds ? b : a)).dow : null;
  const quizPct = st.quiz.total ? Math.round((st.quiz.score / st.quiz.total) * 100) : null;

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Estatísticas de leitura</h1>
      <p className="mt-2 text-ink-2 max-w-2xl">
        Tudo o que você lê no Legis entra aqui, com ou sem trilha. Um artigo conta como lido quando fica alguns segundos na sua tela, e o tempo só corre enquanto você está
        ativo na página. Só você vê estes números.
      </p>

      {empty ? (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-surface p-8 text-center">
          <p className="text-4xl">📊</p>
          <p className="mt-3 font-medium text-lg">Ainda não há leituras registradas.</p>
          <p className="mt-2 text-sm text-ink-2 max-w-md mx-auto">Abra qualquer lei e leia normalmente: em poucos minutos suas estatísticas começam a aparecer.</p>
          <Link href="/" className="mt-5 inline-grid h-11 px-5 rounded-xl bg-accent text-accent-ink font-medium place-items-center">
            Ir para a legislação
          </Link>
        </div>
      ) : (
        <>
          <section className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile icon="⏱️" value={fmtDur(t.seconds)} label="de leitura no total" />
            <Tile icon="📅" value={fmtDur(avg)} label={`em média por dia de leitura (${t.days} ${t.days === 1 ? "dia" : "dias"})`} />
            <Tile icon="📖" value={nf.format(t.articles)} label={`artigos diferentes lidos em ${t.norms} ${t.norms === 1 ? "norma" : "normas"}`} />
            <Tile icon="🔥" value={`${st.streak}`} label={`dias seguidos · recorde ${st.bestStreak}`} />
          </section>

          <section className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
            <Insight label="Horário em que você mais lê" value={peakHour !== null ? `${peakHour}h às ${(peakHour + 1) % 24}h` : "—"} />
            <Insight label="Dia da semana preferido" value={peakDow !== null ? WEEKDAYS[peakDow] : "—"} />
            <Insight
              label="Acertos nos questionários"
              value={quizPct !== null ? `${quizPct}% (${st.quiz.score}/${st.quiz.total} em ${st.quiz.attempts} ${st.quiz.attempts === 1 ? "tentativa" : "tentativas"})` : "nenhum feito ainda"}
            />
          </section>

          <div className="mt-8 grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
            <ChartCard title="Minutos de leitura por dia" sub="Últimos 30 dias">
              <Bars data={days.map((d) => ({ label: d.label, value: d.min, tip: `${d.label}: ${fmtDur(d.min * 60)}` }))} ticks={[0, 7, 14, 21, 29]} />
            </ChartCard>
            <ChartCard title="Quando você lê" sub="Minutos por hora do dia, desde o início">
              <Bars data={hours.map((v, h) => ({ label: `${h}h`, value: v, tip: `${h}h–${(h + 1) % 24}h: ${fmtDur(v * 60)}` }))} ticks={[0, 6, 12, 18, 23]} />
            </ChartCard>
          </div>

          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Quanto você já leu de cada norma</h2>
            {st.norms.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Nenhuma norma aberta ainda.</p>
            ) : (
              <ul className="mt-4 grid md:grid-cols-2 gap-3">
                {st.norms.map((n) => {
                  const pct = n.articles_total ? Math.min(100, (n.articles_read / n.articles_total) * 100) : 0;
                  return (
                    <li key={n.id} className="rounded-2xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/lei/${n.slug}`} className="min-w-0 hover:text-accent">
                          <span className="block font-medium leading-snug truncate">{n.name}</span>
                          <span className="block text-xs text-muted truncate">{n.title}</span>
                        </Link>
                        <span className="shrink-0 text-2xl font-semibold tabular-nums">
                          {pct < 1 && pct > 0 ? "<1" : Math.round(pct)}
                          <span className="text-sm text-muted">%</span>
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct > 0 ? Math.max(2, pct) : 0}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted tabular-nums flex flex-wrap gap-x-3">
                        <span>
                          {nf.format(n.articles_read)} de {nf.format(n.articles_total)} artigos
                        </span>
                        <span>{fmtDur(n.seconds)}</span>
                        {n.last_at && <span>{relativeTime(n.last_at)}</span>}
                      </p>
                      {n.last_anchor && (
                        <Link href={`/lei/${n.slug}#${n.last_anchor}`} className="mt-2 inline-block text-xs font-medium text-accent hover:underline">
                          Continuar de onde parou{n.last_label ? ` (${n.last_label})` : ""} →
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Artigos que você mais leu</h2>
            {st.top.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Ainda nenhum artigo registrado.</p>
            ) : (
              <ol className="mt-4 rounded-2xl border border-line bg-surface divide-y divide-line">
                {st.top.map((a, i) => (
                  <li key={`${a.slug}-${a.anchor}`}>
                    <Link href={`/lei/${a.slug}#${a.anchor}`} className="flex items-start gap-4 px-4 py-3 hover:bg-surface-2/60 transition">
                      <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">
                          <strong className="font-semibold">{a.label ?? a.anchor}</strong> <span className="text-muted">· {a.name}</span>
                        </span>
                        {a.text && <span className="block text-sm font-law text-ink-2 line-clamp-1">{a.text}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-muted tabular-nums">
                        {a.views} {a.views === 1 ? "leitura" : "leituras"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {trail.days > 0 && (
            <p className="mt-8 text-sm text-ink-2">
              Nas trilhas: {nf.format(trail.days)} {trail.days === 1 ? "dia concluído" : "dias concluídos"} e {nf.format(trail.articles)} artigos no plano.{" "}
              <Link href="/trilhas" className="text-accent hover:underline">
                Ver trilhas →
              </Link>
            </p>
          )}
        </>
      )}
    </main>
  );
}

function Tile({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-lg" aria-hidden>
        {icon}
      </p>
      <p className="mt-1 text-2xl sm:text-[1.7rem] font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-muted leading-snug">{label}</p>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2/70 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 font-medium first-letter:uppercase">{value}</p>
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-xs text-muted">{sub}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Barras simples (uma série): topo arredondado, 2px de respiro entre barras, dica ao passar o mouse e tabela para leitores de tela. */
function Bars({ data, ticks }: { data: { label: string; value: number; tip: string }[]; ticks: number[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = niceMax(max);
  return (
    <figure>
      <div className="relative h-40">
        {[0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line/70 border-dashed" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2.5 right-0 bg-surface pl-1 text-[10px] text-muted tabular-nums">{Math.round(top * f)} min</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-line pr-10">
          {data.map((d, i) => (
            <div key={i} className="group relative flex-1 h-full flex items-end">
              <div className="w-full rounded-t-[4px] bg-accent group-hover:brightness-125 transition" style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-md bg-ink text-bg px-2 py-1 text-[11px] opacity-0 group-hover:opacity-100 transition z-10">
                {d.tip}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative h-5 mt-1 mr-10 text-[10px] text-muted">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((t + 0.5) / data.length) * 100}%` }}>
            {data[t]?.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.label}</td>
              <td>{fmtDur(d.value * 60)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function niceMax(v: number) {
  for (const n of [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720]) if (v <= n) return n;
  return Math.ceil(v / 60) * 60;
}
