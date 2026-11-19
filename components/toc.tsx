"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface TocItem {
  anchor: string;
  label: string;
  heading: string;
  level: number;
  revoked: boolean;
}

interface Node extends TocItem {
  depth: number;
  parent: number; // índice do pai (-1 = raiz)
  hasChildren: boolean;
}

/** Monta a árvore (Livro > Título > Capítulo > Seção…) a partir da lista plana. */
function buildTree(items: TocItem[]): Node[] {
  const out: Node[] = [];
  const stack: number[] = [];
  items.forEach((it, i) => {
    while (stack.length && items[stack[stack.length - 1]].level >= it.level) stack.pop();
    const parent = stack.length ? stack[stack.length - 1] : -1;
    out.push({ ...it, depth: stack.length, parent, hasChildren: false });
    if (parent >= 0) out[parent].hasChildren = true;
    stack.push(i);
  });
  return out;
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

const SidebarIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16M5.5 8h1.5M5.5 11h1.5" />
  </svg>
);

/** Sumário da norma: lateral retrátil no desktop, gaveta no celular/tablet; níveis abrem e fecham. */
export function Toc({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false); // gaveta (celular)
  const [filter, setFilter] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const tree = useMemo(() => buildTree(items), [items]);
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  // barra lateral recolhida (desktop)
  const toggleSidebar = useCallback(() => {
    const root = document.documentElement;
    const closed = root.dataset.toc === "fechado";
    if (closed) delete root.dataset.toc;
    else root.dataset.toc = "fechado";
    try {
      localStorage.setItem("legis:toc", closed ? "aberto" : "fechado");
    } catch {}
  }, []);

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

  // abre automaticamente os ancestrais do trecho em leitura
  useEffect(() => {
    if (!active) return;
    const i = tree.findIndex((n) => n.anchor === active);
    if (i < 0) return;
    setExpanded((prev) => {
      let p = tree[i].parent;
      let changed = false;
      const next = new Set(prev);
      while (p >= 0) {
        if (!next.has(p)) {
          next.add(p);
          changed = true;
        }
        p = tree[p].parent;
      }
      return changed ? next : prev;
    });
  }, [active, tree]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const expandAll = () => setExpanded(new Set(tree.map((n, i) => (n.hasChildren ? i : -1)).filter((i) => i >= 0)));
  const collapseAll = () => setExpanded(new Set());

  const f = filter.trim().toLowerCase();
  const visible = (i: number) => {
    let p = tree[i].parent;
    while (p >= 0) {
      if (!expanded.has(p)) return false;
      p = tree[p].parent;
    }
    return true;
  };
  const shown = f
    ? tree.map((n, i) => [n, i] as const).filter(([n]) => `${n.label} ${n.heading}`.toLowerCase().includes(f))
    : tree.map((n, i) => [n, i] as const).filter(([, i]) => visible(i));
  const anyNested = tree.some((n) => n.hasChildren);

  const list = (
    <div className="flex flex-col min-h-0 h-full">
      <div className="p-1 pb-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar sumário"
          className="w-full h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
        />
      </div>
      {anyNested && !f && (
        <div className="flex gap-1 px-1 pb-2 text-xs">
          <button onClick={expandAll} className="h-7 px-2.5 rounded-lg bg-surface-2 text-ink-2 hover:text-ink">
            Expandir tudo
          </button>
          <button onClick={collapseAll} className="h-7 px-2.5 rounded-lg bg-surface-2 text-ink-2 hover:text-ink">
            Recolher tudo
          </button>
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-muted px-2">Esta norma não tem divisões internas.</p>
      ) : (
        <ol className="overflow-y-auto min-h-0 flex-1 pr-1 text-[13px] leading-snug space-y-0.5 no-scrollbar">
          {shown.map(([n, i]) => {
            const isOpen = expanded.has(i);
            return (
              <li key={n.anchor} className="flex items-start" style={{ paddingLeft: `${(f ? 0 : n.depth) * 0.75}rem` }}>
                {n.hasChildren && !f ? (
                  <button
                    onClick={() => toggle(i)}
                    className="mt-1 size-6 shrink-0 rounded-md grid place-items-center text-muted hover:bg-surface-2 hover:text-ink"
                    aria-label={isOpen ? `Recolher ${n.label}` : `Expandir ${n.label}`}
                    aria-expanded={isOpen}
                  >
                    <Chevron open={isOpen} />
                  </button>
                ) : (
                  <span className="w-6 shrink-0" />
                )}
                <a
                  href={`#${n.anchor}`}
                  onClick={() => setOpen(false)}
                  className={`min-w-0 flex-1 block rounded-lg px-2 py-1.5 transition ${active === n.anchor ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink"} ${n.revoked ? "opacity-50" : ""}`}
                >
                  <span className="text-[11px] uppercase tracking-wide text-muted block">{n.label}</span>
                  {n.heading && <span className="block">{n.heading}</span>}
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block py-10 min-w-0">
        <div className="toc-aberto sticky top-24 h-[calc(100dvh-7rem)]">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sumário</p>
            <button onClick={toggleSidebar} className="size-7 rounded-lg grid place-items-center text-muted hover:bg-surface-2 hover:text-ink" title="Recolher sumário" aria-label="Recolher sumário">
              <SidebarIcon className="size-4" />
            </button>
          </div>
          {list}
        </div>
        <div className="toc-fechado sticky top-24">
          <button
            onClick={toggleSidebar}
            className="size-10 rounded-xl border border-line bg-surface grid place-items-center text-ink-2 hover:text-ink hover:shadow-[var(--shadow)]"
            title="Mostrar sumário"
            aria-label="Mostrar sumário"
          >
            <SidebarIcon className="size-5" />
          </button>
        </div>
      </aside>
      <button
        onClick={() => setOpen(true)}
        className="no-print lg:hidden fixed bottom-5 right-4 sm:right-5 z-40 h-12 w-12 sm:w-auto sm:px-5 justify-center rounded-full bg-ink text-bg shadow-lg text-sm font-medium flex items-center gap-2"
        aria-label="Abrir sumário"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M4 6h16M4 12h10M4 18h13" />
        </svg>
        <span className="hidden sm:inline">Sumário</span>
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
