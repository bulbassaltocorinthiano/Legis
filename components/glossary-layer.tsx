"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface TermDto {
  slug: string;
  term: string;
  area: string;
  short_definition: string;
  definition: string;
  legal_basis: string | null;
}

interface Pop {
  x: number;
  y: number;
  above: boolean;
  query: string;
  slug?: string;
  loading: boolean;
  results: TermDto[];
}

/**
 * Camada da biblioteca doutrinária sobre o texto legal:
 *  - clique/Enter num termo sublinhado abre o verbete;
 *  - selecionar qualquer palavra (ou dar duplo clique) mostra "Consultar significado".
 */
export function GlossaryLayer() {
  const [pop, setPop] = useState<Pop | null>(null);
  const [ask, setAsk] = useState<{ x: number; y: number; text: string } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const cache = useRef(new Map<string, TermDto[]>());

  const fetchTerms = useCallback(async (key: string, url: string) => {
    if (cache.current.has(key)) return cache.current.get(key)!;
    const r = await fetch(url);
    const data: TermDto[] = r.ok ? await r.json() : [];
    cache.current.set(key, data);
    return data;
  }, []);

  const openAt = useCallback(
    async (rect: DOMRect, opts: { slug?: string; query: string }) => {
      const above = rect.bottom + 320 > window.innerHeight && rect.top > 340;
      const x = Math.min(Math.max(12, rect.left + rect.width / 2 - 180), window.innerWidth - 372);
      const y = above ? rect.top + window.scrollY - 8 : rect.bottom + window.scrollY + 8;
      setAsk(null);
      setPop({ x, y, above, query: opts.query, slug: opts.slug, loading: true, results: [] });
      const results = opts.slug
        ? await fetchTerms(`s:${opts.slug}`, `/api/doutrina?slug=${encodeURIComponent(opts.slug)}`)
        : await fetchTerms(`q:${opts.query.toLowerCase()}`, `/api/doutrina?q=${encodeURIComponent(opts.query)}`);
      setPop((p) => (p && p.query === opts.query ? { ...p, loading: false, results } : p));
    },
    [fetchTerms],
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-term]");
      if (t && !document.getElementById("lei")?.classList.contains("sem-termos")) {
        e.preventDefault();
        openAt(t.getBoundingClientRect(), { slug: t.dataset.term, query: t.textContent ?? "" });
        return;
      }
      if (popRef.current && !popRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest("[data-ask]")) setPop(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPop(null);
        setAsk(null);
      }
      if (e.key === "Enter") {
        const t = (e.target as HTMLElement).closest?.<HTMLElement>("[data-term]");
        if (t) openAt(t.getBoundingClientRect(), { slug: t.dataset.term, query: t.textContent ?? "" });
      }
    };
    const onSelect = () => {
      const sel = window.getSelection();
      const text = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
      if (!sel || sel.isCollapsed || text.length < 3 || text.length > 60 || text.split(" ").length > 5) {
        setAsk(null);
        return;
      }
      const lei = document.getElementById("lei");
      if (!lei || !lei.contains(sel.anchorNode)) return;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setAsk({ x: rect.left + rect.width / 2 + window.scrollX, y: rect.top + window.scrollY - 8, text: text.replace(/[.,;:()"]+$/g, "").replace(/^[("]+/, "") });
    };
    let selTimer: ReturnType<typeof setTimeout>;
    const onSelChange = () => {
      clearTimeout(selTimer);
      selTimer = setTimeout(onSelect, 250);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    document.addEventListener("selectionchange", onSelChange);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("selectionchange", onSelChange);
    };
  }, [openAt]);

  return (
    <>
      {ask && (
        <button
          data-ask
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            openAt(new DOMRect(r.left, r.top + 36, r.width, 0), { query: ask.text });
          }}
          style={{ left: ask.x, top: ask.y }}
          className="absolute z-50 -translate-x-1/2 -translate-y-full rounded-full bg-ink text-bg text-xs font-medium px-3 py-2 shadow-lg flex items-center gap-1.5 font-sans"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
            <path d="M8 7h7M8 11h5" />
          </svg>
          Consultar significado
        </button>
      )}
      {pop && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Biblioteca doutrinária"
          style={{ left: pop.x, top: pop.y }}
          className={`absolute z-50 w-[min(360px,calc(100vw-24px))] rounded-2xl border border-line bg-surface shadow-[var(--shadow)] font-sans text-sm ${pop.above ? "-translate-y-full" : ""}`}
        >
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {pop.loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 w-1/2 rounded bg-surface-2" />
                <div className="h-3 w-full rounded bg-surface-2" />
                <div className="h-3 w-4/5 rounded bg-surface-2" />
              </div>
            ) : pop.results.length === 0 ? (
              <div>
                <p className="font-medium">“{pop.query}”</p>
                <p className="text-ink-2 mt-1">Ainda não há verbete para esta expressão na biblioteca doutrinária.</p>
                <Link href={`/doutrina?q=${encodeURIComponent(pop.query)}`} className="inline-block mt-3 text-accent hover:underline">
                  Procurar na biblioteca →
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {(pop.slug ? pop.results.slice(0, 1) : pop.results.slice(0, 3)).map((t) => (
                  <li key={t.slug}>
                    <p className="text-[11px] uppercase tracking-wider text-muted">{t.area}</p>
                    <p className="font-semibold text-base text-ink">{t.term}</p>
                    <p className="mt-1 text-ink font-medium leading-snug">{t.short_definition}</p>
                    <p className="mt-2 text-ink-2 leading-relaxed">{t.definition}</p>
                    {t.legal_basis && <p className="mt-2 text-xs text-muted">Base: {t.legal_basis}</p>}
                    <Link href={`/doutrina/${t.slug}`} className="inline-block mt-2 text-xs text-accent hover:underline">
                      Abrir verbete →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
