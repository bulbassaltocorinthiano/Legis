"use client";
import { useEffect } from "react";

const READ_AFTER_S = 4; // segundos com o artigo na tela para contar como lido
const IDLE_S = 90; // sem interação por mais que isso, o tempo para de contar
const FLUSH_S = 30;

/**
 * Registra a leitura para as estatísticas: tempo ativo na norma e artigos que ficaram
 * na tela por alguns segundos. Envia em lotes (e ao sair da página) para /api/leitura.
 */
export function ReadingTracker({ normId, scopeId = "lei", trackTime = true }: { normId: number; scopeId?: string; trackTime?: boolean }) {
  useEffect(() => {
    const visible = new Set<Element>();
    const articleOf = new WeakMap<Element, string>(); // dispositivo -> âncora do artigo a que pertence
    const seenFor = new Map<string, number>();
    const done = new Set<string>();
    let pendingAnchors: string[] = [];
    let pendingSeconds = 0;
    let lastActive = Date.now();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
      },
      { rootMargin: "-15% 0px -30% 0px", threshold: 0 },
    );
    // o texto da lei chega em streaming: pode ainda não estar na página quando este efeito roda,
    // então os artigos são (re)procurados periodicamente; observar o mesmo elemento de novo não tem efeito.
    const observed = new WeakSet<Element>();
    // cada parágrafo, inciso etc. conta para o artigo que o precede (artigos longos também são registrados)
    const scan = () => {
      let cur: string | null = null;
      document
        .getElementById(scopeId)
        ?.querySelectorAll<HTMLElement>("p.dispositivo[id]")
        .forEach((el) => {
          if (el.classList.contains("artigo")) cur = el.id;
          if (!cur) return;
          articleOf.set(el, cur);
          if (observed.has(el)) return;
          observed.add(el);
          io.observe(el);
        });
    };
    scan();

    const active = () => (lastActive = Date.now());
    const evs = ["scroll", "keydown", "pointerdown", "pointermove", "touchstart", "wheel"] as const;
    evs.forEach((ev) => window.addEventListener(ev, active, { passive: true }));

    const flush = (beacon = false) => {
      if (!pendingAnchors.length && pendingSeconds < 5) return;
      const body = JSON.stringify({ normId, anchors: pendingAnchors.slice(0, 200), seconds: trackTime ? Math.round(pendingSeconds) : 0 });
      pendingAnchors = [];
      pendingSeconds = 0;
      try {
        if (beacon && navigator.sendBeacon) navigator.sendBeacon("/api/leitura", new Blob([body], { type: "application/json" }));
        else fetch("/api/leitura", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
      } catch {}
    };

    let ticks = 0;
    const timer = window.setInterval(() => {
      if (ticks % 3 === 0) scan();
      if (document.visibilityState !== "visible" || Date.now() - lastActive > IDLE_S * 1000) {
        ticks++;
        return;
      }
      pendingSeconds += 1;
      const arts = new Set<string>();
      for (const el of visible) {
        const a = articleOf.get(el);
        if (a && el.isConnected) arts.add(a);
      }
      for (const id of arts) {
        if (done.has(id)) continue;
        const t = (seenFor.get(id) ?? 0) + 1;
        seenFor.set(id, t);
        if (t >= READ_AFTER_S) {
          done.add(id);
          pendingAnchors.push(id);
        }
      }
      if (++ticks % FLUSH_S === 0) flush();
    }, 1000);

    const onHide = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const onLeave = () => flush(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);

    return () => {
      flush(true);
      window.clearInterval(timer);
      io.disconnect();
      evs.forEach((ev) => window.removeEventListener(ev, active));
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [normId, scopeId, trackTime]);
  return null;
}
