"use client";
import { useEffect, useRef, useState } from "react";
import { usePrefs } from "./prefs";

/** Barra de ferramentas do leitor: ir para artigo, tamanho da fonte e opções de exibição. */
export function ReaderControls() {
  const { prefs, update } = usePrefs();
  const [open, setOpen] = useState(false);
  const [goto, setGoto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // aplica classes de exibição ao texto
  useEffect(() => {
    const el = document.getElementById("lei");
    if (!el) return;
    el.classList.toggle("sans", !!prefs.sans);
    el.classList.toggle("sem-termos", !!prefs.hideTerms);
    el.classList.toggle("hide-notes", !!prefs.hideNotes);
    el.classList.toggle("hide-revoked", !!prefs.hideRevoked);
    el.classList.toggle("sem-cobrados", !!prefs.hideCobrados);
  }, [prefs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "");
      if (!typing && e.key === "g" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  // ao abrir com #âncora, destaca o dispositivo
  useEffect(() => {
    const flash = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el) {
        el.classList.add("flash");
        setTimeout(() => el.classList.remove("flash"), 1800);
      }
    };
    flash();
    window.addEventListener("hashchange", flash);
    return () => window.removeEventListener("hashchange", flash);
  }, []);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const raw = goto.trim().toLowerCase().replace(/^art(igo)?\.?\s*/, "");
    const adct = /adct/.test(raw);
    const num = raw.replace(/adct/g, "").replace(/[º°o.\s]/g, "").replace(/^(\d+)([a-z])$/, "$1-$2");
    if (!num) return;
    const id = `art${adct ? "adct" : ""}${num}`;
    const el = document.getElementById(id);
    if (el) {
      history.replaceState(null, "", `#${id}`);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 1800);
      setMsg(null);
      inputRef.current?.blur();
    } else setMsg("Artigo não encontrado");
  }

  const size = prefs.size ?? 1.0625;
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
      <form onSubmit={go} className="relative">
        <input
          ref={inputRef}
          value={goto}
          onChange={(e) => {
            setGoto(e.target.value);
            setMsg(null);
          }}
          inputMode="text"
          placeholder="Art. nº"
          aria-label="Ir para artigo"
          className="w-[4.5rem] sm:w-32 h-9 rounded-lg border border-line bg-surface px-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        {msg && <span className="absolute top-full mt-1 right-0 whitespace-nowrap text-xs text-err bg-surface border border-line rounded-md px-2 py-1">{msg}</span>}
      </form>
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="h-9 px-2.5 sm:px-3 rounded-lg border border-line bg-surface text-sm flex items-center gap-1.5 hover:bg-surface-2"
          aria-expanded={open}
          aria-label="Opções de leitura"
        >
          <span className="font-law text-base leading-none">Aa</span>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-line bg-surface shadow-[var(--shadow)] p-4 text-sm space-y-4 z-50">
            <div>
              <p className="text-xs text-muted mb-2">Tamanho do texto</p>
              <div className="flex items-center gap-2">
                <button className="size-9 rounded-lg border border-line hover:bg-surface-2" onClick={() => update({ size: Math.max(0.875, +(size - 0.0625).toFixed(4)) })} aria-label="Diminuir">
                  A−
                </button>
                <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${((size - 0.875) / (1.5 - 0.875)) * 100}%` }} />
                </div>
                <button className="size-9 rounded-lg border border-line hover:bg-surface-2" onClick={() => update({ size: Math.min(1.5, +(size + 0.0625).toFixed(4)) })} aria-label="Aumentar">
                  A+
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
              <button onClick={() => update({ sans: undefined })} className={`h-8 rounded-lg font-law ${!prefs.sans ? "bg-surface shadow-sm" : "text-ink-2"}`}>
                Serifada
              </button>
              <button onClick={() => update({ sans: true })} className={`h-8 rounded-lg ${prefs.sans ? "bg-surface shadow-sm" : "text-ink-2"}`}>
                Sem serifa
              </button>
            </div>
            <Toggle label="Mostrar notas de alteração" checked={!prefs.hideNotes} onChange={(v) => update({ hideNotes: v ? undefined : true })} />
            <Toggle label="Mostrar dispositivos revogados" checked={!prefs.hideRevoked} onChange={(v) => update({ hideRevoked: v ? undefined : true })} />
            <Toggle label="Sublinhar termos da doutrina" checked={!prefs.hideTerms} onChange={(v) => update({ hideTerms: v ? undefined : true })} />
            <Toggle label="Marcar artigos mais cobrados" checked={!prefs.hideCobrados} onChange={(v) => update({ hideCobrados: v ? undefined : true })} />
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span>{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition ${checked ? "bg-accent" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
