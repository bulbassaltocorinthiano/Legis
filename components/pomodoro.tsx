"use client";
// Pomodoro nativo: o estado fica no localStorage (sobrevive a recarregar a página e a trocar de aba do site).
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Mode = "foco" | "pausa";
interface PomoState {
  status: "idle" | "running" | "paused" | "done";
  mode: Mode;
  duration: number; // segundos
  endAt: number | null; // epoch ms (quando rodando)
  remaining: number; // segundos (quando pausado)
  sessions: number; // sessões de foco concluídas hoje
  day: string;
}

const KEY = "legis:pomodoro";
const EVT = "legis:pomodoro";
const today = () => new Date().toLocaleDateString("sv-SE");
const DEFAULT: PomoState = { status: "idle", mode: "foco", duration: 25 * 60, endAt: null, remaining: 25 * 60, sessions: 0, day: "" };

function read(): PomoState {
  try {
    const s = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || "{}") } as PomoState;
    if (s.day !== today()) {
      s.sessions = 0;
      s.day = today();
    }
    return s;
  } catch {
    return DEFAULT;
  }
}
function write(s: PomoState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  cache = null;
  window.dispatchEvent(new Event(EVT));
}

let cache: { raw: string | null; val: PomoState } | null = null;
function snapshot(): PomoState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (!cache || cache.raw !== raw) cache = { raw, val: read() };
  return cache.val;
}
function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Relógio de 1 s compartilhado (só renderiza quem usa). */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function usePomodoro() {
  const s = useSyncExternalStore(subscribe, snapshot, () => DEFAULT);
  const now = useNow(s.status === "running");
  const left = s.status === "running" && s.endAt ? Math.max(0, Math.round((s.endAt - now) / 1000)) : s.status === "done" ? 0 : s.remaining;
  const progress = s.duration ? 1 - left / s.duration : 0;

  const start = useCallback((minutes: number, mode: Mode = "foco") => {
    const d = Math.round(minutes * 60);
    write({ ...read(), status: "running", mode, duration: d, remaining: d, endAt: Date.now() + d * 1000 });
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  }, []);
  const pause = useCallback(() => {
    const c = read();
    if (c.status !== "running" || !c.endAt) return;
    write({ ...c, status: "paused", remaining: Math.max(0, Math.round((c.endAt - Date.now()) / 1000)), endAt: null });
  }, []);
  const resume = useCallback(() => {
    const c = read();
    if (c.status !== "paused") return;
    write({ ...c, status: "running", endAt: Date.now() + c.remaining * 1000 });
  }, []);
  const reset = useCallback(() => {
    const c = read();
    write({ ...c, status: "idle", endAt: null, remaining: c.duration });
  }, []);
  return { ...s, left, progress, start, pause, resume, reset };
}

export const fmt = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.2);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
}

/** Anel de progresso. */
export function Ring({ progress, size = 28, stroke = 3, className = "" }: { progress: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`-rotate-90 ${className}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}

const PRESETS = [
  { min: 25, label: "25 min", hint: "clássico" },
  { min: 50, label: "50 min", hint: "foco longo" },
  { min: 90, label: "90 min", hint: "bloco profundo" },
];
const BREAKS = [5, 10, 15];

/** Painel de controle (usado no cabeçalho e no cartão da página inicial). */
export function PomodoroControls({ compact = false }: { compact?: boolean }) {
  const p = usePomodoro();
  const [custom, setCustom] = useState("");
  const active = p.status === "running" || p.status === "paused";

  if (active) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={`relative grid place-items-center ${p.mode === "pausa" ? "text-emerald-500" : "text-[var(--tomato)]"}`}>
            <Ring progress={p.progress} size={compact ? 64 : 96} stroke={compact ? 5 : 7} />
            <span className={`absolute font-semibold tabular-nums text-ink ${compact ? "text-sm" : "text-lg"}`}>{fmt(p.left)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted">{p.mode === "foco" ? "Estudando" : "Pausa"}</p>
            <p className="font-medium">
              {p.status === "paused" ? "Pausado" : `Termina às ${new Date(Date.now() + p.left * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
            <p className="text-xs text-muted">Sessão de {Math.round(p.duration / 60)} min</p>
          </div>
        </div>
        <div className="flex gap-2">
          {p.status === "running" ? (
            <button onClick={p.pause} className="flex-1 h-10 rounded-xl bg-ink text-bg font-medium hover:opacity-90">
              Pausar
            </button>
          ) : (
            <button onClick={p.resume} className="flex-1 h-10 rounded-xl bg-[var(--tomato)] text-white font-medium hover:opacity-90">
              Continuar
            </button>
          )}
          <button onClick={p.reset} className="h-10 px-4 rounded-xl border border-line hover:bg-surface-2">
            Encerrar
          </button>
        </div>
      </div>
    );
  }

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(custom.replace(",", "."));
    if (n >= 1 && n <= 240) p.start(n);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((x) => (
          <button
            key={x.min}
            onClick={() => p.start(x.min)}
            className="rounded-xl border border-line bg-surface px-2 py-2.5 text-center hover:border-[var(--tomato)] hover:bg-[var(--tomato-soft)] transition"
          >
            <span className="block font-semibold tabular-nums">{x.label}</span>
            <span className="block text-[11px] text-muted">{x.hint}</span>
          </button>
        ))}
      </div>
      <form onSubmit={go} className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Minutos de estudo</span>
          <input
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/[^\d,.]/g, ""))}
            placeholder="Outro tempo"
            className="w-full h-10 rounded-xl border border-line bg-surface pl-3 pr-12 text-sm outline-none focus:border-[var(--tomato)] focus:ring-4 focus:ring-[var(--tomato-soft)]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">min</span>
        </label>
        <button className="h-10 px-4 rounded-xl bg-[var(--tomato)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40" disabled={!custom}>
          Iniciar
        </button>
      </form>
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Pausa:</span>
        {BREAKS.map((b) => (
          <button key={b} onClick={() => p.start(b, "pausa")} className="h-7 px-2.5 rounded-lg bg-surface-2 hover:bg-line text-ink-2 tabular-nums">
            {b} min
          </button>
        ))}
        {p.sessions > 0 && <span className="ml-auto">{p.sessions} hoje</span>}
      </div>
    </div>
  );
}

const TomatoIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 6V3.5M9 6.5c1-1.2 2-1.6 3-.5 1-1.1 2-.7 3 .5" />
    <path d="M12 10v3.5l2 1.5" />
  </svg>
);

/** Botão do cabeçalho + barra fina de progresso + aviso ao terminar. Montado uma vez no layout. */
export function PomodoroHeader() {
  const p = usePomodoro();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<null | { mode: Mode; minutes: number }>(null);
  const ref = useRef<HTMLDivElement>(null);
  const baseTitle = useRef<string>("");
  const active = p.status === "running" || p.status === "paused";

  // fecha ao clicar fora
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // término
  useEffect(() => {
    if (p.status !== "running" || p.left > 0) return;
    const c = read();
    if (c.status !== "running") return;
    write({ ...c, status: "done", endAt: null, remaining: 0, sessions: c.sessions + (c.mode === "foco" ? 1 : 0) });
    const info = { mode: c.mode, minutes: Math.round(c.duration / 60) };
    setNotice(info);
    chime();
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
        new Notification(info.mode === "foco" ? "Sessão de estudo concluída" : "Pausa encerrada", {
          body: info.mode === "foco" ? `${info.minutes} min de foco. Hora de uma pausa.` : "Bora voltar aos estudos.",
          icon: "/icon.svg",
        });
      }
    } catch {}
  }, [p.status, p.left]);

  // contagem no título da aba
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title;
    if (p.status === "running") document.title = `${fmt(p.left)} · ${p.mode === "foco" ? "Estudo" : "Pausa"}`;
    else if (baseTitle.current) document.title = baseTitle.current;
  }, [p.status, p.left, p.mode]);
  useEffect(() => {
    const restore = () => {
      if (read().status !== "running") baseTitle.current = document.title;
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);

  const color = p.mode === "pausa" ? "text-emerald-500" : "text-[var(--tomato)]";

  return (
    <>
      {active && (
        <div className="fixed top-0 inset-x-0 h-[3px] z-[60] pointer-events-none" aria-hidden>
          <div
            className={`h-full ${p.mode === "pausa" ? "bg-emerald-500" : "bg-[var(--tomato)]"} ${p.status === "paused" ? "opacity-40" : "pomo-glow"}`}
            style={{ width: `${p.progress * 100}%`, transition: "width 1s linear" }}
          />
        </div>
      )}
      <div className="relative shrink-0" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`h-9 rounded-full flex items-center gap-1.5 transition ${
            active ? "pl-1 pr-2.5 sm:pr-3 bg-[var(--tomato-soft)] text-ink" : "w-9 justify-center text-ink-2 hover:bg-surface-2"
          }`}
          aria-label={active ? `Pomodoro: ${fmt(p.left)} restantes` : "Pomodoro"}
          aria-expanded={open}
          title="Pomodoro"
        >
          {active ? (
            <>
              <span className={`relative grid place-items-center ${color}`}>
                <Ring progress={p.progress} size={28} stroke={3} />
                <span className={`absolute size-1.5 rounded-full bg-current ${p.status === "running" ? "animate-pulse" : ""}`} />
              </span>
              <span className="text-sm font-semibold tabular-nums">{fmt(p.left)}</span>
            </>
          ) : (
            <TomatoIcon className="size-5" />
          )}
        </button>
        {open && (
          <div className="fixed left-4 right-4 top-[4.25rem] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 rounded-2xl border border-line bg-surface shadow-[var(--shadow)] p-4 z-50">
            <div className="flex items-center gap-2 mb-3">
              <TomatoIcon className="size-5 text-[var(--tomato)]" />
              <p className="font-semibold">Pomodoro</p>
              <span className="ml-auto text-xs text-muted">{p.sessions > 0 ? `${p.sessions} sessão(ões) hoje` : "escolha o tempo"}</span>
            </div>
            <PomodoroControls compact />
          </div>
        )}
      </div>
      {notice && <FinishedNotice info={notice} onClose={() => setNotice(null)} />}
    </>
  );
}

function FinishedNotice({ info, onClose }: { info: { mode: Mode; minutes: number }; onClose: () => void }) {
  const p = usePomodoro();
  const foco = info.mode === "foco";
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4 bg-black/30 backdrop-blur-[2px] pomo-fade" role="alertdialog" aria-modal="true" aria-labelledby="pomo-done">
      <div className="w-full max-w-sm rounded-3xl bg-surface border border-line shadow-2xl p-6 text-center pomo-pop">
        <div className={`mx-auto size-16 rounded-full grid place-items-center ${foco ? "bg-[var(--tomato-soft)] text-[var(--tomato)]" : "bg-emerald-500/15 text-emerald-600"}`}>
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h2 id="pomo-done" className="mt-4 text-xl font-semibold">
          {foco ? "Sessão concluída!" : "Pausa encerrada"}
        </h2>
        <p className="mt-1 text-ink-2">
          {foco ? `Você estudou ${info.minutes} minutos. Que tal uma pausa?` : "Hora de voltar aos estudos."}
          {foco && p.sessions > 1 && <span className="block text-sm text-muted mt-1">{p.sessions} sessões hoje.</span>}
        </p>
        <div className="mt-5 grid gap-2">
          {foco ? (
            <>
              <button onClick={() => (p.start(p.sessions % 4 === 0 ? 15 : 5, "pausa"), onClose())} className="h-11 rounded-xl bg-emerald-600 text-white font-medium hover:opacity-90">
                Pausa de {p.sessions % 4 === 0 ? 15 : 5} minutos
              </button>
              <button onClick={() => (p.start(info.minutes), onClose())} className="h-11 rounded-xl border border-line hover:bg-surface-2">
                Mais {info.minutes} min de estudo
              </button>
            </>
          ) : (
            <button onClick={() => (p.start(25), onClose())} className="h-11 rounded-xl bg-[var(--tomato)] text-white font-medium hover:opacity-90">
              Estudar 25 minutos
            </button>
          )}
          <button onClick={() => (p.reset(), onClose())} className="h-10 text-sm text-muted hover:text-ink">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Cartão da página inicial. */
export function PomodoroCard() {
  const p = usePomodoro();
  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5">
      <div className="absolute -right-10 -top-10 size-36 rounded-full bg-[var(--tomato-soft)] blur-2xl" aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-2">
          <TomatoIcon className="size-5 text-[var(--tomato)]" />
          <h2 className="font-semibold">Sessão de estudo</h2>
          {p.sessions > 0 && (
            <span className="ml-auto flex gap-1" title={`${p.sessions} sessão(ões) hoje`}>
              {Array.from({ length: Math.min(p.sessions, 8) }).map((_, i) => (
                <span key={i} className="size-2 rounded-full bg-[var(--tomato)]" />
              ))}
            </span>
          )}
        </div>
        <p className="mt-1 mb-4 text-sm text-muted">Escolha o tempo; o cronômetro continua no topo enquanto você lê.</p>
        <PomodoroControls />
      </div>
    </div>
  );
}
