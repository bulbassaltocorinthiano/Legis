"use client";
import { useEffect, useState } from "react";

/** Barra fina no topo mostrando quanto do trecho do dia já foi rolado. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const on = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const done = -r.top + window.innerHeight * 0.4;
      setPct(Math.max(0, Math.min(100, total > 0 ? (done / total) * 100 : 100)));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, [targetId]);
  return (
    <div className="fixed left-0 right-0 top-16 z-30 h-1 bg-transparent pointer-events-none" aria-hidden>
      <div className="h-full bg-[linear-gradient(90deg,var(--accent),#7c3aed)] transition-[width] duration-150" style={{ width: `${pct}%` }} />
    </div>
  );
}
