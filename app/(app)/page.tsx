import Link from "next/link";
import { getCategories, getFeatured, getHomeStats, getRecentlyChanged } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/format";
import { AreaIcon, areaColor } from "@/components/area-visual";
import { PomodoroCard } from "@/components/pomodoro";
import { RecentReads } from "@/components/recent-reads";
import { TrailHomeCard } from "@/components/trilhas/home-card";

export const dynamic = "force-dynamic";

const TZ = "America/Fortaleza";

const FEATURED: Record<string, { short: string; name: string; color: string }> = {
  "CF-1988": { short: "CF/88", name: "Constituição Federal", color: "#2952e3" },
  "LEI-10406-2002": { short: "CC", name: "Código Civil", color: "#7c3aed" },
  "LEI-13105-2015": { short: "CPC", name: "Processo Civil", color: "#4c3fd1" },
  "DL-2848-1940": { short: "CP", name: "Código Penal", color: "#c92a2a" },
  "DL-3689-1941": { short: "CPP", name: "Processo Penal", color: "#d6336c" },
  "LEI-5172-1966": { short: "CTN", name: "Código Tributário", color: "#d9480f" },
  "LEI-8078-1990": { short: "CDC", name: "Consumidor", color: "#0f8b8d" },
  "DL-5452-1943": { short: "CLT", name: "Leis do Trabalho", color: "#e67700" },
};

const SUGESTOES = ["prescrição intercorrente", "honorários advocatícios", "tutela de urgência", "legítima defesa", "dano moral"];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(new Date()));
  return h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

const nf = new Intl.NumberFormat("pt-BR");

export default async function Home() {
  const [user, cats, featured, recent, stats] = await Promise.all([requireUser(), getCategories(), getFeatured(), getRecentlyChanged(), getHomeStats()]);
  const federal = cats.filter((c) => c.sphere === "federal");
  const estadual = cats.filter((c) => c.sphere !== "federal");
  const firstName = user.name.split(/\s+/)[0];
  const today = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date());

  return (
    <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-5 sm:py-8">
      {/* Destaque */}
      <section className="relative overflow-hidden rounded-[28px] bg-[var(--navy)] text-white px-5 py-8 sm:px-10 sm:py-12">
        <HeroArt />
        <div className="relative grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_400px] gap-8 lg:gap-12 items-end">
          <div>
            <p className="text-sm text-white/60 first-letter:uppercase">{today}</p>
            <h1 className="mt-2 font-law text-[2.1rem] sm:text-5xl leading-[1.08] tracking-tight">
              {greeting()}, <span className="text-[var(--gold)]">{firstName}</span>.
            </h1>
            <p className="mt-3 max-w-xl text-white/75 text-base sm:text-lg leading-relaxed">
              A lei vigente, direto da fonte oficial, com prazos em destaque e a jurisprudência do STJ ao lado de cada artigo.
            </p>
            <form action="/busca" className="mt-6 max-w-xl flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-[0_10px_40px_-10px_rgb(0_0_0/0.5)]">
              <svg className="ml-2.5 size-5 shrink-0 text-[#7a766c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                name="q"
                required
                placeholder="Busque uma lei, artigo ou expressão"
                className="min-w-0 flex-1 h-11 bg-transparent text-[#1b1a17] placeholder:text-[#8a867c] outline-none text-base"
              />
              <button className="h-11 px-4 sm:px-5 rounded-xl bg-[var(--gold)] text-[#1b1a17] font-semibold hover:brightness-105 transition">Buscar</button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <Link
                  key={s}
                  href={`/busca?q=${encodeURIComponent(s)}`}
                  className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-[13px] text-white/85 grid place-items-center transition"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-2.5">
              <Stat value={nf.format(stats.normas)} label="normas com texto oficial" />
              <Stat value={nf.format(stats.artigos)} label="artigos indexados" />
              <Stat value={nf.format(stats.julgados)} label="precedentes do STJ" />
              <Stat value={nf.format(stats.conceitos)} label="conceitos na doutrina" />
              <div className="col-span-2 md:col-span-4 lg:col-span-2 flex items-center gap-2 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 px-4 py-3 text-sm text-white/75">
                <span className="relative flex size-2.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                  <span className="relative size-2.5 rounded-full bg-emerald-400" />
                </span>
                {stats.conferido ? (
                  <span>
                    Conferido no Planalto <strong className="text-white font-medium">{relativeTime(stats.conferido)}</strong>
                  </span>
                ) : (
                  <span>Primeira carga em andamento</span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 sm:mt-10 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-10">
        <div className="min-w-0 space-y-10">
          <RecentReads />

          {/* Códigos */}
          <section>
            <SectionTitle>Códigos e leis essenciais</SectionTitle>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {featured.map((n) => {
                const f = FEATURED[n.key] ?? { short: n.nickname ?? n.key, name: n.title, color: "#2952e3" };
                return (
                  <Link
                    key={n.id}
                    href={n.status === "ok" ? `/lei/${n.slug}` : "#"}
                    style={{ ["--c" as string]: f.color }}
                    className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:p-5 hover:-translate-y-0.5 hover:shadow-[var(--shadow)] hover:border-[color-mix(in_srgb,var(--c)_45%,transparent)] transition"
                  >
                    <span className="absolute inset-x-0 top-0 h-1 bg-[var(--c)]" aria-hidden />
                    <span
                      className="absolute right-3 bottom-1 font-law text-6xl leading-none text-[var(--c)] opacity-[0.08] select-none group-hover:opacity-[0.16] transition"
                      aria-hidden
                    >
                      §
                    </span>
                    <span className="block text-2xl font-bold tracking-tight text-[var(--c)]">{f.short}</span>
                    <span className="mt-1 block text-sm font-medium text-ink">{f.name}</span>
                    <span className="mt-3 block text-xs text-muted tabular-nums">
                      {n.status === "ok" ? `${nf.format(n.article_count)} artigos` : "aguardando carga"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Áreas */}
          <section>
            <SectionTitle>Legislação federal por área</SectionTitle>
            <ul className="mt-4 grid sm:grid-cols-2 gap-3">
              {federal.map((c) => (
                <AreaItem key={c.id} c={c} />
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                <MaFlag /> Legislação do Maranhão
              </span>
            </SectionTitle>
            <ul className="mt-4 grid sm:grid-cols-2 gap-3">
              {estadual.map((c) => (
                <AreaItem key={c.id} c={c} />
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <TrailHomeCard />
          <PomodoroCard />

          <div className="rounded-3xl border border-line bg-surface p-5">
            <h2 className="font-semibold flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="size-5 text-accent" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
                <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
              </svg>
              Atualizado recentemente
            </h2>
            {recent.length === 0 ? (
              <p className="text-sm text-muted mt-3">Nenhuma alteração detectada ainda. O robô confere o Planalto a cada 6 horas.</p>
            ) : (
              <ol className="mt-4 relative border-l border-line ml-1.5 space-y-4">
                {recent.map((n) => (
                  <li key={n.id} className="pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-accent ring-4 ring-surface" />
                    <Link href={`/lei/${n.slug}`} className="text-sm hover:text-accent">
                      <span className="font-medium line-clamp-1">{n.nickname ?? n.title}</span>
                      <span className="block text-xs text-muted">{n.changed_at ? formatDateTime(n.changed_at) : ""}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-3xl bg-[var(--prazo-bg)]/50 border border-[color-mix(in_srgb,var(--gold)_35%,transparent)] p-5 text-sm text-ink-2 leading-relaxed">
            <h2 className="font-semibold text-ink">Como ler</h2>
            <ul className="mt-3 space-y-2.5">
              <li className="flex gap-2.5">
                <Dot />
                <span>
                  <strong className="font-extrabold text-[var(--prazo)] bg-[linear-gradient(transparent_62%,var(--prazo-bg)_62%)]">Prazos</strong> aparecem em negrito.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Dot />
                <span>
                  <span className="underline decoration-dotted decoration-accent/60 underline-offset-4">Termos sublinhados</span> abrem o conceito. Selecione
                  qualquer palavra para consultá-la.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Dot />
                <span>Na aba Jurisprudência, cada artigo mostra os precedentes do STJ que o citam.</span>
              </li>
              <li className="flex gap-2.5">
                <Dot />
                <span>
                  Atalhos: <kbd className="text-xs border border-line bg-surface rounded px-1">/</kbd> busca,{" "}
                  <kbd className="text-xs border border-line bg-surface rounded px-1">g</kbd> ir para artigo.
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 px-4 py-3.5 backdrop-blur-sm">
      <p className="text-2xl sm:text-[1.7rem] font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-xs text-white/60 leading-snug">{label}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{children}</h2>;
}

function Dot() {
  return <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--gold)]" />;
}

function MaFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-3.5 w-auto rounded-[3px] ring-1 ring-line" aria-hidden>
      <rect width="30" height="20" fill="#fff" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <rect key={i} y={i * (20 / 9)} width="30" height={20 / 9} fill={i % 2 === 0 ? (i % 4 === 0 ? "#c8102e" : "#000") : "#fff"} />
      ))}
      <rect width="15" height={(20 / 9) * 4} fill="#0033a0" />
      <path d="m7.5 2.6.9 2.7h2.8l-2.3 1.7.9 2.7-2.3-1.7-2.3 1.7.9-2.7-2.3-1.7h2.8z" fill="#fff" />
    </svg>
  );
}

function AreaItem({ c }: { c: { id: number; slug: string; title: string; total: number; ok: number } }) {
  const pct = c.total ? Math.round((c.ok / c.total) * 100) : 0;
  const color = areaColor(c.id);
  return (
    <li>
      <Link
        href={`/area/${c.slug}`}
        style={{ ["--c" as string]: color }}
        className="group flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-[color-mix(in_srgb,var(--c)_40%,transparent)] hover:shadow-[var(--shadow)] transition"
      >
        <span className="size-11 shrink-0 rounded-xl grid place-items-center text-[var(--c)] bg-[color-mix(in_srgb,var(--c)_12%,transparent)] group-hover:bg-[var(--c)] group-hover:text-white transition">
          <AreaIcon id={c.id} className="size-[22px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-snug">{cap(c.title.replace(/^Maranhão: /, ""))}</span>
          <span className="mt-2 flex items-center gap-2 text-xs text-muted">
            <span className="h-1.5 flex-1 max-w-32 rounded-full bg-surface-2 overflow-hidden">
              <span className="block h-full rounded-full bg-[var(--c)]" style={{ width: `${pct}%` }} />
            </span>
            <span className="tabular-nums">
              {c.ok}/{c.total}
            </span>
          </span>
        </span>
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}

/** Arte de fundo do destaque: brilhos, grade fina e um "§" grande. */
function HeroArt() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute -top-24 -right-20 size-[420px] rounded-full bg-[#2952e3] opacity-50 blur-[90px]" />
      <div className="absolute -bottom-32 left-1/3 size-[360px] rounded-full bg-[var(--gold)] opacity-[0.18] blur-[90px]" />
      <svg className="absolute inset-0 size-full opacity-[0.07]">
        <defs>
          <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0v32" fill="none" stroke="#fff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>
      <span className="absolute right-[-1.5rem] top-[-3rem] font-law text-[18rem] leading-none text-white opacity-[0.05] select-none hidden sm:block">§</span>
    </div>
  );
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
