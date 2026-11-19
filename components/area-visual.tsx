// Cor e ícone de cada área (usado na página inicial e na página da área).
const ICONS = {
  colunas: "M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M2 10l10-6 10 6z",
  predio: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M2 21h20",
  moedas: "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  recibo: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3",
  casa: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6",
  martelo: "m13 4 7 7M10.5 6.5l7 7M12 5l-6 6 7 7 6-6M9.5 14.5 3 21M14 21h7",
  maleta: "M3 8h18v12H3zM8 8V5h8v3M3 13h18M11 13v2h2v-2",
  escudo: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4",
  coracao: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  folha: "M5 20c0-9 6-15 15-15 0 9-6 15-15 15ZM5 20c3-4.5 6-7 10-9",
  urna: "M4 11h16v9H4zM8 11V4h8v7M10 7.5h4M4 15h16",
  balanca: "M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0L7 7Zm10 0-3 7a3 3 0 0 0 6 0l-3-7ZM8 21h8",
  carimbo: "M9 3h6v6l2 3H7l2-3zM5 15h14v3H5zM4 21h16",
  capacete: "M3 18h18M5 18a7 7 0 0 1 14 0M10 11V6.5a2 2 0 0 1 4 0V11",
} as const;

const AREAS: Record<number, { color: string; icon: keyof typeof ICONS }> = {
  1: { color: "#2952e3", icon: "colunas" },
  2: { color: "#0f8b8d", icon: "predio" },
  3: { color: "#c48a12", icon: "moedas" },
  4: { color: "#d9480f", icon: "recibo" },
  5: { color: "#7c3aed", icon: "casa" },
  6: { color: "#4c3fd1", icon: "martelo" },
  7: { color: "#0c7a4a", icon: "maleta" },
  8: { color: "#c92a2a", icon: "escudo" },
  9: { color: "#d6336c", icon: "coracao" },
  10: { color: "#2b8a3e", icon: "folha" },
  11: { color: "#1971c2", icon: "urna" },
  12: { color: "#5f3dc4", icon: "balanca" },
  13: { color: "#8c5a2b", icon: "carimbo" },
  14: { color: "#e67700", icon: "capacete" },
  15: { color: "#2952e3", icon: "colunas" },
  16: { color: "#0f8b8d", icon: "predio" },
  17: { color: "#c48a12", icon: "moedas" },
  18: { color: "#d9480f", icon: "recibo" },
  19: { color: "#8c5a2b", icon: "carimbo" },
  20: { color: "#2b8a3e", icon: "folha" },
};

export function areaColor(id: number) {
  return AREAS[id]?.color ?? "#2952e3";
}

export function AreaIcon({ id, className = "size-5" }: { id: number; className?: string }) {
  const a = AREAS[id] ?? AREAS[1];
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[a.icon]} />
    </svg>
  );
}
