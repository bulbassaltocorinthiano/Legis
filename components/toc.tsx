"use client";
import { useEffect, useMemo, useState } from "react";

export interface TocItem {
  anchor: string;
  label: string;
  heading: string;
  level: number;
  revoked: boolean;
}

/** Sumário da norma: fixo na lateral no desktop, gaveta no celular/tablet. */
export function Toc({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const minLevel = useMemo(() => Math.min(...items.map((i) => i.level), 9), [items]);

  useEffect(() => {
    if (!items.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    for (const it of items) {
      const el = document.getElementById(it.anchor);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [items]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const f = filter.trim().toLowerCase();
  const shown = f ? items.filter((i) => `${i.label} ${i.heading}`.toLowerCase().includes(f)) : items;

  const list = (
    <div className="flex flex-col min-h-0 h-full">
      <div className="p-1 pb-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar sumário"
          className="w-full h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
        />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted px-2">Esta norma não tem divisões internas.</p>
      ) : (
        <ol className="overflow-y-auto min-h-0 flex-1 pr-1 text-[13px] leading-snug space-y-0.5 no-scrollbar">
          {shown.map((i) => (
            <li key={i.anchor} style={{ paddingLeft: `${Math.max(0, i.level - minLevel) * 0.75}rem` }}>
              <a
                href={`#${i.anchor}`}
                onClick={() => setOpen(false)}
                className={`block rounded-lg px-2 py-1.5 transition ${active === i.anchor ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink"} ${i.revoked ? "opacity-50" : ""}`}
              >
                <span className="text-[11px] uppercase tracking-wide text-muted block">{i.label}</span>
                {i.heading && <span className="block">{i.heading}</span>}
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block py-10">
        <div className="sticky top-24 h-[calc(100dvh-7rem)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted px-2 mb-2">Sumário</p>
          {list}
        </div>
      </aside>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-5 right-5 z-40 h-12 px-5 rounded-full bg-ink text-bg shadow-lg text-sm font-medium flex items-center gap-2"
        aria-label="Abrir sumário"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M4 12h10M4 18h13" />
        </svg>
        Sumário
      </button>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Sumário">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] h-[85dvh] rounded-t-3xl bg-bg p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Sumário</p>
              <button onClick={() => setOpen(false)} className="size-9 rounded-full hover:bg-surface-2 grid place-items-center" aria-label="Fechar">
                ✕
              </button>
            </div>
            {list}
          </div>
        </div>
      )}
    </>
  );
}
