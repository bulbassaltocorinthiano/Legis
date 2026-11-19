"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Visit {
  slug: string;
  title: string;
  subtitle: string;
  at: number;
}
const KEY = "legis:recentes";

function read(): Visit[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

/** Registra a leitura de uma norma (montado na página da lei). */
export function TrackVisit({ slug, title, subtitle }: { slug: string; title: string; subtitle: string }) {
  useEffect(() => {
    try {
      const list = [{ slug, title, subtitle, at: Date.now() }, ...read().filter((v) => v.slug !== slug)].slice(0, 8);
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {}
  }, [slug, title, subtitle]);
  return null;
}

function ago(t: number) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export function RecentReads() {
  const [list, setList] = useState<Visit[] | null>(null);
  useEffect(() => setList(read()), []);
  if (!list || list.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Continue lendo</h2>
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
        {list.slice(0, 6).map((v) => (
          <li key={v.slug} className="snap-start shrink-0 w-60">
            <Link
              href={`/lei/${v.slug}`}
              className="group block h-full rounded-2xl border border-line bg-surface p-4 hover:border-accent/40 hover:shadow-[var(--shadow)] transition"
            >
              <span className="flex items-center gap-2 text-[11px] text-muted">
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {ago(v.at)}
              </span>
              <span className="mt-2 block font-medium leading-snug line-clamp-2 group-hover:text-accent">{v.title}</span>
              <span className="mt-0.5 block text-xs text-muted truncate">{v.subtitle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
