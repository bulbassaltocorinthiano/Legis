"use client";
// Marca-texto, borracha e notas pessoais sobre o texto legal.
// As marcações são guardadas por usuário no servidor como (âncora do dispositivo, início, fim, trecho)
// e pintadas com a CSS Custom Highlight API, sem alterar o HTML da lei.
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Highlight } from "@/lib/data";
import { addHighlights, deleteHighlights, saveNote } from "@/app/(app)/lei/actions";

type Tool = "off" | "marker" | "eraser" | "note";
export const COLORS = [
  { id: "amarelo", label: "Amarelo", swatch: "#ffd43b" },
  { id: "verde", label: "Verde", swatch: "#69db7c" },
  { id: "rosa", label: "Rosa", swatch: "#f783ac" },
  { id: "azul", label: "Azul", swatch: "#74c0fc" },
] as const;

const PREF_KEY = "legis:marcador";
const supportsHighlights = () => typeof CSS !== "undefined" && "highlights" in CSS && typeof (globalThis as { Highlight?: unknown }).Highlight === "function";

// ---------- utilidades de texto ----------
const lei = () => document.getElementById("lei");
const containerOf = (node: Node | null): HTMLElement | null => {
  const el = node ? (node.nodeType === 1 ? (node as Element) : node.parentElement) : null;
  return (el?.closest("[data-hl]") as HTMLElement | null) ?? null;
};
function offsetIn(container: HTMLElement, node: Node, offset: number) {
  const r = document.createRange();
  r.selectNodeContents(container);
  r.setEnd(node, offset);
  return r.toString().length;
}
function rangeFor(container: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let sNode: Text | null = null;
  let sOff = 0;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const len = node.data.length;
    if (!sNode && start <= pos + len) {
      sNode = node;
      sOff = start - pos;
    }
    if (sNode && end <= pos + len) {
      const r = document.createRange();
      r.setStart(sNode, sOff);
      r.setEnd(node, end - pos);
      return r;
    }
    pos += len;
  }
  return null;
}
/** Confere o trecho guardado; se o texto mudou de posição, procura o trecho no dispositivo. */
function locate(container: HTMLElement, h: Highlight): [number, number] | null {
  const text = container.textContent ?? "";
  if (text.slice(h.start_off, h.end_off) === h.quote) return [h.start_off, h.end_off];
  const i = text.indexOf(h.quote);
  return i >= 0 ? [i, i + h.quote.length] : null;
}
interface Segment {
  anchor: string;
  start: number;
  end: number;
  quote: string;
}
function segmentsOf(range: Range): Segment[] {
  const root = lei();
  if (!root) return [];
  const out: Segment[] = [];
  for (const c of root.querySelectorAll<HTMLElement>("[data-hl]")) {
    if (!range.intersectsNode(c)) continue;
    const text = c.textContent ?? "";
    let s = c.contains(range.startContainer) ? offsetIn(c, range.startContainer, range.startOffset) : 0;
    let e = c.contains(range.endContainer) ? offsetIn(c, range.endContainer, range.endOffset) : text.length;
    while (s < e && /\s/.test(text[s])) s++;
    while (e > s && /\s/.test(text[e - 1])) e--;
    if (e > s) out.push({ anchor: c.dataset.hl!, start: s, end: e, quote: text.slice(s, e) });
  }
  return out;
}
function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  const r = d.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}
/** Rótulo legível do dispositivo (ex.: "Art. 85, § 2º"). */
function labelOf(anchor: string) {
  const p = document.getElementById(anchor);
  if (!p) return "";
  const own = p.querySelector(".rotulo")?.textContent?.replace(/\s*–\s*$/, "").trim() ?? "";
  if (p.classList.contains("artigo")) return own;
  let prev = p.previousElementSibling;
  while (prev && !prev.classList.contains("artigo")) prev = prev.previousElementSibling;
  const art = prev?.querySelector(".rotulo")?.textContent?.trim();
  return [art, own].filter(Boolean).join(", ");
}

// ---------- componente ----------
export function MarkupLayer({ normId, initial }: { normId: number; initial: Highlight[] }) {
  const router = useRouter();
  const [marks, setMarks] = useState<Highlight[]>(initial);
  const marksRef = useRef(marks);
  marksRef.current = marks;
  const [tool, setTool] = useState<Tool>("off");
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const [color, setColor] = useState<string>("amarelo");
  const colorRef = useRef(color);
  colorRef.current = color;
  const [bubble, setBubble] = useState<null | { x: number; y: number; below: boolean; text: string }>(null);
  const [composer, setComposer] = useState<null | { anchor: string; quote: string | null; label: string }>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const tempId = useRef(-1);

  const say = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast((c) => (c === t ? null : c)), 2200);
  }, []);

  // preferência de cor
  useEffect(() => {
    setSupported(supportsHighlights());
    try {
      const c = localStorage.getItem(PREF_KEY);
      if (c && COLORS.some((x) => x.id === c)) setColor(c);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(PREF_KEY, color);
    } catch {}
  }, [color]);

  // pinta as marcações
  const paint = useCallback(() => {
    if (!supportsHighlights()) return;
    const root = lei();
    if (!root) return;
    const groups = new Map<string, Range[]>(COLORS.map((c) => [c.id, []]));
    for (const h of marksRef.current) {
      const c = root.querySelector<HTMLElement>(`[data-hl="${CSS.escape(h.anchor)}"]`);
      if (!c) continue;
      const pos = locate(c, h);
      if (!pos) continue;
      const r = rangeFor(c, pos[0], pos[1]);
      if (r) groups.get(h.color)?.push(r);
    }
    for (const [id, ranges] of groups) CSS.highlights.set(`hl-${id}`, new Highlight(...ranges));
  }, []);
  useEffect(() => {
    paint();
  }, [marks, paint]);
  useEffect(() => {
    const root = lei();
    if (!root) return;
    let t: ReturnType<typeof setTimeout>;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(paint, 120);
    });
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      mo.disconnect();
      if (supportsHighlights()) COLORS.forEach((c) => CSS.highlights.delete(`hl-${c.id}`));
    };
  }, [paint]);

  // ferramenta ativa → atributo no texto (cursor) e aviso para a camada da doutrina
  useEffect(() => {
    const root = lei();
    if (root) root.dataset.tool = tool;
    setBubble(null);
  }, [tool]);

  const addFromRange = useCallback(
    async (range: Range, c: string) => {
      const segs = segmentsOf(range).filter(
        (s) => !marksRef.current.some((m) => m.anchor === s.anchor && m.color === c && m.start_off <= s.start && m.end_off >= s.end),
      );
      if (!segs.length) return;
      const temps: Highlight[] = segs.map((s) => ({ id: tempId.current--, anchor: s.anchor, start_off: s.start, end_off: s.end, color: c, quote: s.quote }));
      setMarks((m) => [...m, ...temps]);
      try {
        const saved = await addHighlights(normId, segs.map((s) => ({ ...s, color: c })));
        const tempIds = new Set(temps.map((t) => t.id));
        setMarks((m) => [...m.filter((x) => !tempIds.has(x.id)), ...saved]);
      } catch (e) {
        const tempIds = new Set(temps.map((t) => t.id));
        setMarks((m) => m.filter((x) => !tempIds.has(x.id)));
        say((e as Error).message || "Não foi possível salvar a marcação.");
      }
    },
    [normId, say],
  );

  const removeMarks = useCallback(
    async (ids: number[]) => {
      if (!ids.length) return;
      const removed = marksRef.current.filter((m) => ids.includes(m.id));
      setMarks((m) => m.filter((x) => !ids.includes(x.id)));
      const real = ids.filter((i) => i > 0);
      try {
        if (real.length) await deleteHighlights(real);
      } catch {
        setMarks((m) => [...m, ...removed]);
        say("Não foi possível apagar.");
      }
    },
    [say],
  );

  const eraseRange = useCallback(
    (range: Range) => {
      const segs = segmentsOf(range);
      const ids = marksRef.current
        .filter((m) => segs.some((s) => s.anchor === m.anchor && m.start_off < s.end && m.end_off > s.start))
        .map((m) => m.id);
      removeMarks(ids);
      if (!ids.length) say("Nenhuma marcação nesse trecho.");
    },
    [removeMarks, say],
  );

  // eventos do texto
  useEffect(() => {
    const root = lei();
    if (!root) return;

    const selectionInText = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
      const r = sel.getRangeAt(0);
      if (!root.contains(r.commonAncestorContainer)) return null;
      return { sel, r };
    };

    const onPointerUp = () => {
      setTimeout(() => {
        const t = toolRef.current;
        if (t !== "marker" && t !== "eraser") return;
        const s = selectionInText();
        if (!s) return;
        if (t === "marker") addFromRange(s.r, colorRef.current);
        else eraseRange(s.r);
        s.sel.removeAllRanges();
      }, 10);
    };

    const onClick = (e: MouseEvent) => {
      const t = toolRef.current;
      if (t === "off" || t === "marker") return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      const target = e.target as HTMLElement;
      if (target.closest("a, button")) return;
      if (t === "eraser") {
        const pos = caretAt(e.clientX, e.clientY);
        const c = pos && containerOf(pos.node);
        if (!pos || !c) return;
        e.preventDefault();
        const off = offsetIn(c, pos.node, pos.offset);
        const text = c.textContent ?? "";
        const ids = marksRef.current
          .filter((m) => {
            if (m.anchor !== c.dataset.hl) return false;
            const p = locate(c, m) ?? [m.start_off, m.end_off];
            return p[0] <= off && off <= p[1] && text.length > 0;
          })
          .map((m) => m.id);
        if (ids.length) removeMarks(ids);
      } else if (t === "note") {
        const p = target.closest<HTMLElement>("#lei p[id]");
        const c = p?.querySelector<HTMLElement>("[data-hl]");
        if (!p || !c) return;
        e.preventDefault();
        setComposer({ anchor: c.dataset.hl!, quote: null, label: labelOf(c.dataset.hl!) });
        setTool("off");
      }
    };

    // bolha de seleção (modo normal)
    let timer: ReturnType<typeof setTimeout>;
    const onSelChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (toolRef.current !== "off") return setBubble(null);
        const s = selectionInText();
        if (!s || !segmentsOf(s.r).length) return setBubble(null);
        const rect = s.r.getBoundingClientRect();
        const coarse = matchMedia("(pointer: coarse)").matches;
        const below = coarse || rect.top < 140;
        setBubble({
          x: Math.min(Math.max(rect.left + rect.width / 2, 150), window.innerWidth - 150) + window.scrollX,
          y: (below ? rect.bottom + 10 : rect.top - 10) + window.scrollY,
          below,
          text: s.sel.toString().replace(/\s+/g, " ").trim(),
        });
      }, 220);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTool("off");
        setBubble(null);
      }
    };

    root.addEventListener("mouseup", onPointerUp);
    root.addEventListener("touchend", onPointerUp);
    root.addEventListener("click", onClick, true);
    document.addEventListener("selectionchange", onSelChange);
    document.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("mouseup", onPointerUp);
      root.removeEventListener("touchend", onPointerUp);
      root.removeEventListener("click", onClick, true);
      document.removeEventListener("selectionchange", onSelChange);
      document.removeEventListener("keydown", onKey);
    };
  }, [addFromRange, eraseRange, removeMarks]);

  const bubbleHighlight = (c: string) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) addFromRange(sel.getRangeAt(0), c);
    sel?.removeAllRanges();
    setColor(c);
    setBubble(null);
  };
  const bubbleNote = () => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const segs = segmentsOf(sel.getRangeAt(0));
    if (!segs.length) return;
    const quote = segs.map((s) => s.quote).join(" … ").slice(0, 600);
    setComposer({ anchor: segs[0].anchor, quote, label: labelOf(segs[0].anchor) });
    sel.removeAllRanges();
    setBubble(null);
  };
  const bubbleErase = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) eraseRange(sel.getRangeAt(0));
    sel?.removeAllRanges();
    setBubble(null);
  };
  const bubbleLookup = () => {
    if (!bubble) return;
    const sel = window.getSelection();
    const rect = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : new DOMRect(bubble.x, bubble.y, 0, 0);
    window.dispatchEvent(new CustomEvent("legis:consultar", { detail: { text: bubble.text.replace(/[.,;:()"]+$/g, "").replace(/^[("]+/, ""), rect } }));
    setBubble(null);
  };
  const short = bubble && bubble.text.length >= 3 && bubble.text.length <= 60 && bubble.text.split(" ").length <= 5;
  const selHasMarks = (() => {
    if (!bubble) return false;
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (!sel || !sel.rangeCount) return false;
    const segs = segmentsOf(sel.getRangeAt(0));
    return marks.some((m) => segs.some((s) => s.anchor === m.anchor && m.start_off < s.end && m.end_off > s.start));
  })();

  const hint =
    tool === "marker"
      ? "Selecione o texto para destacar"
      : tool === "eraser"
        ? "Toque numa marcação ou selecione um trecho para apagar"
        : tool === "note"
          ? "Toque no dispositivo que quer anotar"
          : null;

  return (
    <>
      {/* Bolha da seleção */}
      {bubble && (
        <div
          data-ask
          onMouseDown={(e) => e.preventDefault()}
          style={{ left: bubble.x, top: bubble.y }}
          className={`absolute z-50 -translate-x-1/2 ${bubble.below ? "" : "-translate-y-full"} flex items-center gap-1 rounded-2xl bg-ink text-bg p-1.5 shadow-xl font-sans text-xs no-print`}
        >
          <span className="flex items-center gap-1 px-1">
            {COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => bubbleHighlight(c.id)}
                className="size-7 rounded-full grid place-items-center hover:scale-110 transition"
                aria-label={`Destacar em ${c.label.toLowerCase()}`}
                title={`Destacar (${c.label.toLowerCase()})`}
              >
                <span className="size-5 rounded-full ring-2 ring-white/30" style={{ background: c.swatch }} />
              </button>
            ))}
          </span>
          <span className="w-px h-6 bg-white/20" />
          {selHasMarks && (
            <BubbleBtn onClick={bubbleErase} label="Apagar">
              <EraserIcon className="size-4" />
            </BubbleBtn>
          )}
          <BubbleBtn onClick={bubbleNote} label="Anotar">
            <NoteIcon className="size-4" />
          </BubbleBtn>
          {short && (
            <BubbleBtn onClick={bubbleLookup} label="Significado">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
                <path d="M8 7h7M8 11h5" />
              </svg>
            </BubbleBtn>
          )}
        </div>
      )}

      {/* Barra de ferramentas */}
      <div className="no-print fixed z-40 bottom-5 left-4 lg:left-1/2 lg:-translate-x-1/2 flex flex-col items-start lg:items-center gap-2">
        {(hint || !supported) && tool !== "off" && (
          <p className="rounded-full bg-ink/90 text-bg text-xs px-3 py-1.5 shadow-lg">{supported ? hint : "Atualize o navegador para ver as marcações."}</p>
        )}
        <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface/95 backdrop-blur p-1.5 shadow-[0_8px_30px_-8px_rgb(0_0_0/0.25)]">
          <ToolBtn active={tool === "marker"} onClick={() => setTool(tool === "marker" ? "off" : "marker")} label="Marca-texto">
            <span className="relative">
              <MarkerIcon className="size-5" />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-surface" style={{ background: COLORS.find((c) => c.id === color)?.swatch }} />
            </span>
          </ToolBtn>
          {tool === "marker" && (
            <span className="flex items-center gap-1 px-1">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  aria-label={c.label}
                  title={c.label}
                  className={`size-7 rounded-full grid place-items-center transition ${color === c.id ? "ring-2 ring-ink/70" : "hover:scale-110"}`}
                >
                  <span className="size-5 rounded-full" style={{ background: c.swatch }} />
                </button>
              ))}
            </span>
          )}
          <ToolBtn active={tool === "eraser"} onClick={() => setTool(tool === "eraser" ? "off" : "eraser")} label="Borracha">
            <EraserIcon className="size-5" />
          </ToolBtn>
          <ToolBtn active={tool === "note"} onClick={() => setTool(tool === "note" ? "off" : "note")} label="Nota">
            <NoteIcon className="size-5" />
          </ToolBtn>
        </div>
      </div>

      {composer && (
        <NoteComposer
          normId={normId}
          target={composer}
          onClose={() => setComposer(null)}
          onSaved={() => {
            setComposer(null);
            say("Nota salva");
            router.refresh();
          }}
        />
      )}

      {toast && (
        <div className="no-print fixed z-[60] bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-ink text-bg text-sm px-4 py-2 shadow-lg pomo-fade" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

function ToolBtn({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`h-10 px-2.5 sm:px-3 rounded-xl flex items-center gap-1.5 text-sm transition ${active ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"}`}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function BubbleBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="h-8 px-2.5 rounded-xl flex items-center gap-1.5 hover:bg-white/15 font-medium">
      {children}
      {label}
    </button>
  );
}

export function NoteComposer({
  normId,
  target,
  onClose,
  onSaved,
  existing,
}: {
  normId: number;
  target: { anchor: string; quote: string | null; label: string };
  onClose: () => void;
  onSaved: () => void;
  existing?: { id: number; body: string };
}) {
  const [body, setBody] = useState(existing?.body ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const submit = () =>
    start(async () => {
      try {
        await saveNote({ id: existing?.id, normId, anchor: target.anchor, quote: target.quote, body });
        onSaved();
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  return (
    <div className="no-print fixed inset-0 z-[65] flex items-end sm:items-center justify-center bg-black/25 backdrop-blur-[2px] pomo-fade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-surface border border-line shadow-2xl p-5 pomo-pop" role="dialog" aria-label="Nota">
        <div className="flex items-center gap-2">
          <span className="size-8 rounded-xl grid place-items-center bg-[var(--prazo-bg)] text-[var(--warn)]">
            <NoteIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{existing ? "Editar nota" : "Nova nota"}</p>
            <p className="text-xs text-muted truncate">{target.label || "Dispositivo"} · visível só para você</p>
          </div>
        </div>
        {target.quote && <blockquote className="mt-4 border-l-4 border-[var(--gold)] pl-3 font-law text-sm text-ink-2 line-clamp-3">{target.quote}</blockquote>}
        <textarea
          ref={ref}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && submit()}
          rows={5}
          maxLength={10000}
          placeholder="Escreva sua anotação…"
          className="mt-4 w-full rounded-2xl border border-line bg-bg/50 p-3 text-[15px] leading-relaxed outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 resize-y"
        />
        {err && <p className="mt-2 text-sm text-err">{err}</p>}
        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-xl border border-line hover:bg-surface-2">
            Cancelar
          </button>
          <button onClick={submit} disabled={pending || !body.trim()} className="h-10 px-5 rounded-xl bg-accent text-accent-ink font-medium hover:opacity-90 disabled:opacity-50">
            {pending ? "Salvando…" : "Salvar nota"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const MarkerIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m14.5 4.5 5 5L11 18l-5-5z" />
    <path d="m6 13-2.5 6.5L10 17" />
    <path d="M13 21h8" />
  </svg>
);
export const EraserIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m7 21-4.3-4.3a1.5 1.5 0 0 1 0-2.1L13.6 3.7a1.5 1.5 0 0 1 2.1 0l4.6 4.6a1.5 1.5 0 0 1 0 2.1L10.5 21z" />
    <path d="M7 21h14M9 10.5l5 5" />
  </svg>
);
export const NoteIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 3h10l4 4v14H5z" />
    <path d="M15 3v4h4M8.5 11h7M8.5 15h5" />
  </svg>
);
