"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function HeaderSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isTyping = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !isTyping)) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className="w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (q) router.push(`/busca?q=${encodeURIComponent(q)}`);
      }}
    >
      <label className="relative flex items-center">
        <span className="sr-only">Buscar na legislação</span>
        <svg className="absolute left-3 size-4 text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Buscar lei, artigo ou expressão…"
          className="w-full h-10 rounded-xl border border-line bg-surface pl-9 pr-14 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 transition placeholder:text-muted"
          enterKeyHint="search"
        />
        <kbd className="hidden lg:block absolute right-2.5 text-[11px] text-muted border border-line rounded-md px-1.5 py-0.5 bg-surface-2">
          Ctrl K
        </kbd>
      </label>
    </form>
  );
}
