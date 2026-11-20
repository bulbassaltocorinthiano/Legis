"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitQuizAction } from "@/app/(app)/trilhas/actions";
import type { Celebration } from "@/lib/trilhas";
import type { PublicQuestion } from "@/lib/trilhas/quiz";
import { Bar, CelebrationModal } from "./celebration";

type Result = NonNullable<Awaited<ReturnType<typeof submitQuizAction>>>;

const LETTERS = ["A", "B", "C", "D", "E"];
const TYPE_LABEL: Record<string, string> = { prazo: "Prazo", pena: "Pena", rubrica: "Tema", artigo: "Dispositivo" };

function verdict(pct: number) {
  if (pct === 100) return { emoji: "🏆", text: "Gabaritou! Lei seca dominada." };
  if (pct >= 80) return { emoji: "🎯", text: "Excelente! Você está pronto para a banca." };
  if (pct >= 60) return { emoji: "💪", text: "Bom resultado. Revise os itens que errou e siga em frente." };
  if (pct >= 40) return { emoji: "📖", text: "Dá para melhorar: releia os artigos indicados abaixo." };
  return { emoji: "🌱", text: "Faz parte do processo. Releia os trechos e refaça o questionário." };
}

export function Quiz({ trailId, dayNo, questions, best }: { trailId: number; dayNo: number; questions: PublicQuestion[]; best: { score: number; total: number } | null }) {
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [i, setI] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [cel, setCel] = useState<Celebration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!questions.length) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-surface p-6 text-ink-2">
        Não há texto suficiente nos dias desta semana para montar o questionário. Pode marcar o dia como concluído.
      </p>
    );
  }

  const send = () =>
    start(async () => {
      setError(null);
      const r = await submitQuizAction(trailId, dayNo, answers);
      if (!r) return setError("Não foi possível registrar o questionário. Tente de novo.");
      setResult(r);
      if (r.celebration) setCel(r.celebration);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  if (result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    const v = verdict(pct);
    return (
      <div>
        <div className="rounded-3xl bg-[var(--navy)] text-white p-6 sm:p-8 text-center">
          <p className="text-5xl">{v.emoji}</p>
          <p className="mt-3 text-4xl font-semibold tabular-nums">
            {result.score}
            <span className="text-white/50 text-2xl">/{result.total}</span>
          </p>
          <p className="mt-2 text-white/80">{v.text}</p>
          <Bar pct={pct} animate className="mt-5 max-w-sm mx-auto !bg-white/15" />
        </div>
        <ol className="mt-6 space-y-3">
          {questions.map((q, k) => {
            const rv = result.review[k];
            const ok = rv.chosen === rv.answer;
            return (
              <li key={q.id} className={`rounded-2xl border p-4 ${ok ? "border-ok/30 bg-ok/5" : "border-err/30 bg-err/5"}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {ok ? "✓ Acertou" : "✗ Errou"} · Questão {k + 1}
                </p>
                <p className="mt-1 text-sm font-medium">{q.prompt}</p>
                {q.quote && <p className="mt-1 font-law text-sm text-ink-2 line-clamp-3">{q.quote}</p>}
                {!ok && (
                  <p className="mt-2 text-sm">
                    {rv.chosen >= 0 && <span className="block text-err line-through decoration-err/50">{q.options[rv.chosen]}</span>}
                    <span className="block text-ok font-medium">Resposta: {rv.correctText}</span>
                  </p>
                )}
                <Link href={`/lei/${rv.ref.slug}#${rv.ref.anchor}`} className="mt-2 inline-block text-xs text-accent hover:underline">
                  Ver {rv.ref.label} em {rv.ref.norm} →
                </Link>
              </li>
            );
          })}
        </ol>
        <div className="mt-8 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => {
              setResult(null);
              setAnswers(questions.map(() => -1));
              setI(0);
              router.refresh();
            }}
            className="h-11 px-5 rounded-xl border border-line font-medium hover:bg-surface-2"
          >
            Refazer o questionário
          </button>
          <Link href={`/trilhas/${trailId}`} className="h-11 px-5 rounded-xl bg-accent text-accent-ink font-medium grid place-items-center">
            Voltar para a trilha
          </Link>
        </div>
        {cel && <CelebrationModal cel={cel} trailId={trailId} quiz={{ score: result.score, total: result.total }} onClose={() => setCel(null)} />}
      </div>
    );
  }

  const q = questions[i];
  const answered = answers.filter((a) => a >= 0).length;
  return (
    <div>
      {best && (
        <p className="mb-4 text-sm text-muted">
          Sua melhor nota até agora: <strong className="text-ink">{best.score}/{best.total}</strong>. Refaça para melhorar!
        </p>
      )}
      <div className="flex items-center justify-between text-xs text-muted mb-1.5">
        <span>
          Questão {i + 1} de {questions.length}
        </span>
        <span className="tabular-nums">{answered} respondidas</span>
      </div>
      <Bar pct={(answered / questions.length) * 100} />

      <div className="mt-6 rounded-3xl border border-line bg-surface p-5 sm:p-7">
        <span className="text-[11px] font-semibold uppercase tracking-wider rounded-md bg-accent-soft text-accent px-2 py-0.5">{TYPE_LABEL[q.type]}</span>
        <p className="mt-3 font-medium leading-snug">{q.prompt}</p>
        {q.quote && <blockquote className="mt-3 border-l-4 border-[var(--gold)] pl-4 font-law text-[1.05rem] leading-relaxed text-ink">{q.quote}</blockquote>}
        <ul className="mt-5 space-y-2">
          {q.options.map((o, k) => {
            const on = answers[i] === k;
            return (
              <li key={k}>
                <button
                  onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? k : x)))}
                  className={`w-full text-left flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${on ? "border-accent bg-accent-soft/60 ring-4 ring-accent/10" : "border-line hover:border-accent/50 hover:bg-surface-2/50"}`}
                >
                  <span className={`size-7 shrink-0 rounded-full grid place-items-center text-xs font-bold ${on ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2"}`}>{LETTERS[k]}</span>
                  <span className="pt-0.5 text-sm leading-relaxed">{o}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="h-11 px-4 rounded-xl border border-line text-sm disabled:opacity-40">
          ← Anterior
        </button>
        <div className="hidden sm:flex gap-1.5">
          {questions.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`Questão ${k + 1}`}
              className={`size-2.5 rounded-full ${k === i ? "bg-accent" : answers[k] >= 0 ? "bg-accent/40" : "bg-line"}`}
            />
          ))}
        </div>
        {i < questions.length - 1 ? (
          <button onClick={() => setI((x) => x + 1)} className="h-11 px-4 rounded-xl bg-accent text-accent-ink text-sm font-medium">
            Próxima →
          </button>
        ) : (
          <button onClick={send} disabled={pending} className="h-11 px-5 rounded-xl bg-[var(--gold)] text-[#1b1a17] text-sm font-semibold disabled:opacity-60">
            {pending ? "Corrigindo…" : answered < questions.length ? `Enviar (${questions.length - answered} em branco)` : "Enviar respostas"}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-err">{error}</p>}
    </div>
  );
}
