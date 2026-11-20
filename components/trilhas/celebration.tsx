"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { completeDayAction, uncompleteDayAction } from "@/app/(app)/trilhas/actions";
import type { Celebration } from "@/lib/trilhas";
import { FRASES_CONCLUSAO, pick } from "@/lib/trilhas/frases";
import "./trilhas.css";

const nf = new Intl.NumberFormat("pt-BR");

/** Botão "Concluí a leitura" + pop-up de comemoração com confete. */
export function CompleteDay({ trailId, dayNo, done, kind }: { trailId: number; dayNo: number; done: boolean; kind: "leitura" | "revisao" }) {
  const [cel, setCel] = useState<Celebration | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (done && !cel) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <p className="inline-flex items-center gap-2 h-12 px-5 rounded-2xl bg-ok/10 text-ok font-medium">
          <Check /> {kind === "revisao" ? "Revisão concluída" : "Leitura concluída"}
        </p>
        <button
          disabled={pending}
          onClick={() => start(async () => { await uncompleteDayAction(trailId, dayNo); router.refresh(); })}
          className="text-sm text-muted hover:text-ink underline underline-offset-4"
        >
          Desmarcar
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center">
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await completeDayAction(trailId, dayNo);
              if (r) setCel(r);
            })
          }
          className="group relative h-14 px-8 rounded-2xl bg-accent text-accent-ink text-base font-semibold shadow-[0_10px_30px_-10px_var(--accent)] hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            <Check /> {pending ? "Registrando…" : kind === "revisao" ? "Concluí a revisão" : "Concluí a leitura de hoje"}
          </span>
        </button>
      </div>
      {cel && <CelebrationModal cel={cel} trailId={trailId} onClose={() => { setCel(null); router.refresh(); }} />}
    </>
  );
}

function CelebrationModal({ cel, trailId, onClose }: { cel: Celebration; trailId: number; onClose: () => void }) {
  const title = cel.trailDone
    ? "Trilha concluída!"
    : cel.milestone
      ? `${cel.milestone}% da trilha!`
      : cel.streak >= 2
        ? `${cel.streak} dias seguidos!`
        : `Dia ${cel.dayNo} concluído!`;
  const emoji = cel.trailDone ? "🎓" : cel.milestone ? "🚀" : cel.streak >= 2 ? "🔥" : "🎉";
  const phrase = cel.trailDone
    ? "Você leu tudo o que se propôs. Isso é disciplina de aprovado. Que tal começar a próxima trilha?"
    : pick(FRASES_CONCLUSAO, cel.dayNo + cel.streak);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="cel-title">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-[fadein_.2s_ease-out]" onClick={onClose} />
      <Confetti big={cel.trailDone || !!cel.milestone} />
      <div className="relative z-[2] w-full max-w-md rounded-[28px] bg-surface border border-line shadow-2xl p-6 sm:p-7 text-center animate-[popin_.35s_cubic-bezier(.2,1.4,.4,1)]">
        <div className="mx-auto size-20 rounded-full bg-[var(--prazo-bg)] grid place-items-center text-4xl">{emoji}</div>
        <h2 id="cel-title" className="mt-4 text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-ink-2 leading-relaxed">{phrase}</p>

        <div className="mt-5">
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>Progresso da trilha</span>
            <span className="tabular-nums font-medium text-ink">
              {cel.doneDays}/{cel.totalDays} dias · {cel.pct}%
            </span>
          </div>
          <Bar pct={cel.pct} animate />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
          <Mini v={nf.format(cel.articles)} l="artigos hoje" />
          <Mini v={nf.format(cel.words)} l="palavras" />
          <Mini v={`${cel.streak} 🔥`} l={cel.streak === 1 ? "dia seguido" : "dias seguidos"} />
        </div>

        {cel.newBadges.length > 0 && (
          <div className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--gold)_45%,transparent)] bg-[var(--prazo-bg)]/50 p-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--warn)]">Nova conquista</p>
            {cel.newBadges.map((b) => (
              <p key={b.title} className="mt-1.5 flex items-center gap-2 text-sm">
                <span className="text-xl">{b.icon}</span>
                <span>
                  <strong>{b.title}</strong> <span className="text-muted">· {b.desc}</span>
                </span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          {cel.nextDay && !cel.trailDone ? (
            <Link href={`/trilhas/${trailId}/dia/${cel.nextDay}`} className="flex-1 h-11 rounded-xl bg-accent text-accent-ink font-medium grid place-items-center">
              Ir para o dia {cel.nextDay}
            </Link>
          ) : (
            <Link href="/trilhas/nova" className="flex-1 h-11 rounded-xl bg-accent text-accent-ink font-medium grid place-items-center">
              Nova trilha
            </Link>
          )}
          <Link href={`/trilhas/${trailId}`} className="flex-1 h-11 rounded-xl border border-line font-medium grid place-items-center hover:bg-surface-2">
            Ver a trilha
          </Link>
        </div>
        <button onClick={onClose} className="absolute top-3 right-3 size-9 rounded-full text-muted hover:bg-surface-2 hover:text-ink" aria-label="Fechar">
          ×
        </button>
      </div>
    </div>
  );
}

export function Bar({ pct, animate = false, className = "" }: { pct: number; animate?: boolean; className?: string }) {
  const [w, setW] = useState(animate ? 0 : pct);
  useEffect(() => {
    if (!animate) return setW(pct);
    const t = setTimeout(() => setW(pct), 120);
    return () => clearTimeout(t);
  }, [pct, animate]);
  return (
    <div className={`h-3 rounded-full bg-surface-2 overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),#7c3aed)] transition-[width] duration-1000 ease-out relative overflow-hidden"
        style={{ width: `${w > 0 ? Math.max(3, w) : 0}%` }}
      >
        <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgb(255_255_255/0.35)_50%,transparent_70%)] animate-[shine_2.4s_linear_infinite]" />
      </div>
    </div>
  );
}

function Mini({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-xl bg-surface-2 py-2.5">
      <p className="font-semibold tabular-nums">{v}</p>
      <p className="text-[11px] text-muted">{l}</p>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Confete leve em canvas, sem dependências. Respeita "reduzir movimento". */
function Confetti({ big }: { big: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = (c.width = window.innerWidth * dpr);
    const H = (c.height = window.innerHeight * dpr);
    const colors = ["#f5b82e", "#1f4fd1", "#7c3aed", "#e0492f", "#157f3b", "#0f8b8d", "#ff7ab6"];
    const N = big ? 220 : 130;
    const ps = Array.from({ length: N }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? W * 0.1 : W * 0.9,
        y: H * 0.65,
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 9) * dpr,
        vy: -(10 + Math.random() * 12) * dpr,
        r: (4 + Math.random() * 5) * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        shape: i % 3,
      };
    });
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const el = t - t0;
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.vy += 0.32 * dpr;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - el / 3200);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 1.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.r);
          ctx.lineTo(p.r, p.r);
          ctx.lineTo(-p.r, p.r);
          ctx.fill();
        }
        ctx.restore();
      }
      if (el < 3300) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [big]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 size-full z-[1]" aria-hidden />;
}
