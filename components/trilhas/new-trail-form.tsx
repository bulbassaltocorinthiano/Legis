"use client";
import { useActionState, useMemo, useState } from "react";
import { createTrailAction, type TrailFormState } from "@/app/(app)/trilhas/actions";
import { estimateDays, PACES, type Pace } from "@/lib/trilhas/plan";

export interface PickNorm {
  id: number;
  name: string;
  sub: string;
  articles: number;
  words: number;
  area: string;
}

const MINUTES = [15, 30, 45, 60, 90, 120];
const REVIEW = [
  { v: 0, label: "Sem revisão" },
  { v: 4, label: "A cada 4 dias" },
  { v: 6, label: "A cada 6 dias" },
  { v: 9, label: "A cada 9 dias" },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const nf = new Intl.NumberFormat("pt-BR");

export function NewTrailForm({ norms, preselect }: { norms: PickNorm[]; preselect: number[] }) {
  const [state, run, pending] = useActionState<TrailFormState, FormData>(createTrailAction, {});
  const [selected, setSelected] = useState<number[]>(preselect.filter((id) => norms.some((n) => n.id === id)));
  const [minutes, setMinutes] = useState(30);
  const [pace, setPace] = useState<Pace>("normal");
  const [review, setReview] = useState(6);
  const [quiz, setQuiz] = useState(true);
  const [filter, setFilter] = useState("");
  const [title, setTitle] = useState("");

  const byId = useMemo(() => new Map(norms.map((n) => [n.id, n])), [norms]);
  const groups = useMemo(() => {
    const f = norm(filter.trim());
    const m = new Map<string, PickNorm[]>();
    for (const n of norms) {
      if (f && !norm(`${n.name} ${n.sub} ${n.area}`).includes(f)) continue;
      m.set(n.area, [...(m.get(n.area) ?? []), n]);
    }
    return [...m.entries()];
  }, [norms, filter]);

  const totalWords = selected.reduce((a, id) => a + (byId.get(id)?.words ?? 0), 0);
  const totalArts = selected.reduce((a, id) => a + (byId.get(id)?.articles ?? 0), 0);
  const days = selected.length ? estimateDays(totalWords, minutes, PACES[pace].wpm, review, quiz) : 0;
  const end = new Date(Date.now() + days * 86400_000);
  const endLabel = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(end);

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const move = (i: number, d: -1 | 1) =>
    setSelected((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const autoTitle = selected.length ? selected.slice(0, 3).map((id) => byId.get(id)?.name).join(" + ") + (selected.length > 3 ? " e mais" : "") : "";

  return (
    <form action={run} className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
      <input type="hidden" name="norms" value={selected.join(",")} />
      <input type="hidden" name="minutes" value={minutes} />
      <input type="hidden" name="pace" value={pace} />
      <input type="hidden" name="review" value={review} />
      <input type="hidden" name="quiz" value={quiz ? "1" : "0"} />
      <input type="hidden" name="title" value={title.trim() || autoTitle} />

      <div className="min-w-0 space-y-8">
        <section>
          <StepTitle n={1}>Quanto tempo por dia?</StepTitle>
          <div className="mt-4 flex flex-wrap gap-2">
            {MINUTES.map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMinutes(m)}
                className={`h-11 px-4 rounded-xl border text-sm font-medium transition ${minutes === m ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-accent/50"}`}
              >
                {fmtMin(m)}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-4 text-sm text-ink-2">
            <input type="range" min={5} max={240} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="flex-1 max-w-sm accent-[var(--accent)]" aria-label="Minutos por dia" />
            <span className="tabular-nums font-semibold text-ink w-20">{minutes} min/dia</span>
          </label>
        </section>

        <section>
          <StepTitle n={2}>Quais normas você quer ler?</StepTitle>
          <p className="mt-1 text-sm text-muted">A ordem em que você escolhe é a ordem da trilha. Dá para reordenar no resumo ao lado.</p>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar: código penal, CDC, 8.112, licitações…"
            className="mt-4 w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          <div className="mt-4 max-h-[520px] overflow-y-auto rounded-2xl border border-line bg-surface divide-y divide-line">
            {groups.length === 0 && <p className="p-5 text-sm text-muted">Nenhuma norma encontrada.</p>}
            {groups.map(([area, list]) => (
              <div key={area}>
                <p className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{area}</p>
                <ul>
                  {list.map((n) => {
                    const on = selected.includes(n.id);
                    return (
                      <li key={n.id}>
                        <label className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2/60 ${on ? "bg-accent-soft/50" : ""}`}>
                          <input type="checkbox" checked={on} onChange={() => toggle(n.id)} className="mt-1 size-4 accent-[var(--accent)]" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium leading-snug">{n.name}</span>
                            <span className="block text-xs text-muted truncate">{n.sub}</span>
                          </span>
                          <span className="text-xs text-muted tabular-nums shrink-0 text-right">
                            {nf.format(n.articles)} arts.
                            <span className="block">≈ {fmtMin(n.words / PACES[pace].wpm)}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <StepTitle n={3}>Seu ritmo de leitura</StepTitle>
          <div className="mt-4 grid sm:grid-cols-3 gap-2">
            {(Object.keys(PACES) as Pace[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPace(p)}
                className={`text-left rounded-2xl border p-3.5 transition ${pace === p ? "border-accent ring-4 ring-accent/15 bg-surface" : "border-line bg-surface hover:border-accent/50"}`}
              >
                <span className="block font-medium text-sm">{PACES[p].label}</span>
                <span className="block text-xs text-muted">
                  ~{PACES[p].wpm} palavras/min · {PACES[p].hint}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium">Dias de revisão</p>
            <p className="text-xs text-muted">Um dia mais leve para revisitar o que você leu (com links para cada trecho).</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REVIEW.map((r) => (
                <button
                  type="button"
                  key={r.v}
                  onClick={() => setReview(r.v)}
                  className={`h-9 px-3 rounded-lg border text-sm transition ${review === r.v ? "border-accent bg-accent-soft text-accent font-medium" : "border-line bg-surface hover:border-accent/50"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 cursor-pointer hover:border-accent/50 transition">
            <input type="checkbox" checked={quiz} onChange={(e) => setQuiz(e.target.checked)} className="mt-0.5 size-5 accent-[var(--accent)]" />
            <span>
              <span className="block text-sm font-medium">Questionário semanal</span>
              <span className="block text-xs text-muted leading-relaxed">
                A cada 7 dias de leitura, um teste de 10 questões sobre o que você leu: prazos, penas e “qual artigo trata disso”. As respostas saem do texto oficial e
                cada correção leva direto ao artigo.
              </span>
            </span>
          </label>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 rounded-3xl bg-[var(--navy)] text-white p-5 sm:p-6 shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-wider text-white/60">Sua trilha</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={autoTitle || "Nome da trilha"}
          maxLength={80}
          className="mt-2 w-full bg-transparent border-b border-white/20 focus:border-[var(--gold)] outline-none text-lg font-semibold placeholder:text-white/40 pb-1"
        />
        {selected.length === 0 ? (
          <p className="mt-5 text-sm text-white/70">Marque as normas ao lado para ver a estimativa da trilha.</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Big v={`≈ ${days}`} l={days === 1 ? "dia" : "dias"} />
              <Big v={nf.format(totalArts)} l="artigos" />
              <Big v={`${minutes}`} l="min/dia" />
            </div>
            <p className="mt-4 text-sm text-white/75">
              Lendo todos os dias, você termina por volta de <strong className="text-[var(--gold)] font-semibold">{endLabel}</strong>.
            </p>
            <ol className="mt-5 space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {selected.map((id, i) => {
                const n = byId.get(id);
                if (!n) return null;
                return (
                  <li key={id} className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2 text-sm">
                    <span className="size-5 shrink-0 rounded-full bg-[var(--gold)] text-[#1b1a17] text-[11px] font-bold grid place-items-center">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{n.name}</span>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="size-6 rounded hover:bg-white/10 disabled:opacity-30" aria-label="Subir">
                      ↑
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="size-6 rounded hover:bg-white/10 disabled:opacity-30" aria-label="Descer">
                      ↓
                    </button>
                    <button type="button" onClick={() => toggle(id)} className="size-6 rounded hover:bg-white/10" aria-label="Remover">
                      ×
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        <button
          disabled={pending || selected.length === 0}
          className="mt-6 w-full h-12 rounded-2xl bg-[var(--gold)] text-[#1b1a17] font-semibold hover:brightness-105 disabled:opacity-50 transition"
        >
          {pending ? "Montando a trilha…" : "Criar trilha"}
        </button>
        {state.error && (
          <p role="alert" className="mt-3 text-sm text-[#ffb4a8]">
            {state.error}
          </p>
        )}
        <p className="mt-4 text-xs text-white/50 leading-relaxed">
          O sistema divide a lei por artigos inteiros, respeitando o tempo diário e encerrando os dias, sempre que possível, no fim de um capítulo ou título.
        </p>
      </aside>
    </form>
  );
}

function fmtMin(m: number) {
  const r = Math.max(1, Math.round(m));
  return r < 60 ? `${r} min` : `${Math.floor(r / 60)}h${r % 60 ? String(r % 60).padStart(2, "0") : ""}`;
}

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-semibold">
      <span className="size-7 rounded-full bg-accent text-accent-ink text-sm grid place-items-center">{n}</span>
      {children}
    </h2>
  );
}

function Big({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] ring-1 ring-white/10 py-3">
      <p className="text-xl font-semibold tabular-nums">{v}</p>
      <p className="text-[11px] text-white/60">{l}</p>
    </div>
  );
}
