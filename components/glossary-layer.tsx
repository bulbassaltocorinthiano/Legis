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
      const leiEl = document.getElementById("lei");
      if (t && !leiEl?.classList.contains("sem-termos") && (leiEl?.dataset.tool ?? "off") === "off") {
        e.preventDefault();
        openAt(t.getBoundingClientRect(), { slug: t.dataset.term, query: t.textContent ?? "" });
        return;
      }
      if (popRef.current && !popRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest("[data-ask]")) setPop(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPop(null);
        }
      if (e.key === "Enter") {
        const t = (e.target as HTMLElement).closest?.<HTMLElement>("[data-term]");
        if (t) openAt(t.getBoundingClientRect(), { slug: t.dataset.term, query: t.textContent ?? "" });
      }
    };
    const onConsult = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; rect: DOMRect }>).detail;
      if (d?.text) openAt(d.rect, { query: d.text });
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("legis:consultar", onConsult);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("legis:consultar", onConsult);
    };
  }, [openAt]);

  return (
    <>
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
