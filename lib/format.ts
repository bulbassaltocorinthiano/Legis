const TZ = "America/Sao_Paulo";

export function formatDateTime(d: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: TZ }).format(new Date(d));
}

export function formatDate(d: string | Date) {
  const s = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00Z` : d;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: TZ }).format(new Date(s));
}

export function relativeTime(d: string | Date) {
  const diff = (Date.now() - (typeof d === "string" ? parseDbTime(d) : d).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (diff < 60) return "agora";
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  return rtf.format(-Math.round(diff / 86400), "day");
}

/** Converte o texto de timestamptz do Postgres ("2026-11-19 18:10:00.12+00") em Date. */
export function parseDbTime(s: string) {
  return new Date(s.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00"));
}
