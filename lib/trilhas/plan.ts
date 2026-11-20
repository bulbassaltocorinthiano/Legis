// Divisão de normas em "dias" de leitura, a partir do tempo diário escolhido.
// Função pura (sem banco) para poder ser testada isoladamente.

export interface PlanArticle {
  key: string; // article_key
  label: string; // "Art. 121"
  ord: number; // ord do nó do artigo (ajuda a reencontrar o artigo se a lei for reingerida)
  endOrd: number; // último ord do bloco do artigo
  words: number; // palavras dos dispositivos vigentes do artigo
  blockStart: boolean; // começa um capítulo/título/livro (bom ponto para encerrar um dia)
}

export interface PlanNorm {
  normId: number;
  articles: PlanArticle[];
}

export interface Segment {
  norm_id: number;
  from_key: string;
  to_key: string;
  from_ord: number;
  to_ord: number;
  from_label: string;
  to_label: string;
  articles: number;
  words: number;
}

export interface PlannedDay {
  kind: "leitura" | "revisao";
  segments: Segment[];
  words: number;
  articles: number;
  est_minutes: number;
  /** dias de leitura revisados (apenas em dias de revisão) */
  review_of?: number[];
}

export const PACES = {
  atenta: { wpm: 110, label: "Atenta", hint: "leitura lenta, com anotações" },
  normal: { wpm: 140, label: "Normal", hint: "ritmo de estudo" },
  dinamica: { wpm: 190, label: "Dinâmica", hint: "revisão de quem já conhece" },
} as const;
export type Pace = keyof typeof PACES;

export const MAX_DAYS = 2000;

export function countWords(s: string | null | undefined) {
  if (!s) return 0;
  const m = s.match(/[\p{L}\p{N}][\p{L}\p{N}ºª°.,/-]*/gu);
  return m ? m.length : 0;
}

/**
 * Agrupa os artigos em dias. Regras:
 *  - enche o dia até o orçamento de palavras (minutos × palavras por minuto), com 10% de tolerância;
 *  - se o dia já passou de 80% do orçamento e o próximo artigo abre um capítulo/título, encerra ali
 *    (o dia termina num ponto natural da lei);
 *  - ao terminar uma norma, se o dia já está com 60% ou mais, a próxima norma começa num dia novo;
 *  - um artigo nunca é partido: um artigo maior que o orçamento ocupa um dia sozinho;
 *  - opcionalmente, a cada N dias de leitura entra um dia de revisão dos N dias anteriores.
 */
export function planTrail(norms: PlanNorm[], minutesPerDay: number, wpm: number, reviewEvery = 0): PlannedDay[] {
  const budget = Math.max(50, Math.round(minutesPerDay * wpm));
  const reading: PlannedDay[] = [];
  let cur: PlannedDay | null = null;

  const close = () => {
    if (cur && cur.segments.length) reading.push(cur);
    cur = null;
  };
  const fresh = (): PlannedDay => ({ kind: "leitura", segments: [], words: 0, articles: 0, est_minutes: 0 });

  for (const norm of norms) {
    for (const a of norm.articles) {
      if (cur && cur.words > 0) {
        if (cur.words + a.words > budget * 1.1) close();
        else if (a.blockStart && cur.words >= budget * 0.8) close();
      }
      if (!cur) cur = fresh();
      const d: PlannedDay = cur;
      let seg = d.segments[d.segments.length - 1];
      if (!seg || seg.norm_id !== norm.normId) {
        seg = { norm_id: norm.normId, from_key: a.key, to_key: a.key, from_ord: a.ord, to_ord: a.endOrd, from_label: a.label, to_label: a.label, articles: 0, words: 0 };
        d.segments.push(seg);
      }
      seg.to_key = a.key;
      seg.to_ord = a.endOrd;
      seg.to_label = a.label;
      seg.words += a.words;
      if (a.words > 0) seg.articles += 1;
      d.words += a.words;
      if (a.words > 0) d.articles += 1;
    }
    const c = cur as PlannedDay | null;
    if (c && c.words >= budget * 0.6) close();
  }
  close();

  // remove dias só com artigos revogados (0 palavras) fundindo-os ao anterior
  const merged: PlannedDay[] = [];
  for (const d of reading) {
    const prev = merged[merged.length - 1];
    if (d.words === 0 && prev) {
      for (const s of d.segments) {
        const last = prev.segments[prev.segments.length - 1];
        if (last && last.norm_id === s.norm_id) {
          last.to_key = s.to_key;
          last.to_ord = s.to_ord;
          last.to_label = s.to_label;
        } else prev.segments.push(s);
      }
    } else merged.push(d);
  }

  for (const d of merged) d.est_minutes = Math.max(1, Math.round(d.words / wpm));

  if (!reviewEvery || reviewEvery < 2) return merged.slice(0, MAX_DAYS);

  const out: PlannedDay[] = [];
  let since: number[] = [];
  for (const d of merged) {
    out.push(d);
    since.push(out.length); // número do dia (1-based)
    if (since.length === reviewEvery) {
      out.push({ kind: "revisao", segments: [], words: 0, articles: 0, est_minutes: Math.min(minutesPerDay, 30), review_of: since });
      since = [];
    }
  }
  return out.slice(0, MAX_DAYS);
}

/** Estimativa rápida (para a prévia no formulário): total de dias a partir do total de palavras. */
export function estimateDays(totalWords: number, minutesPerDay: number, wpm: number, reviewEvery = 0) {
  const reading = Math.max(1, Math.ceil(totalWords / Math.max(50, minutesPerDay * wpm)));
  return reading + (reviewEvery >= 2 ? Math.floor(reading / reviewEvery) : 0);
}

/** "Arts. 1º a 45", ou o rótulo único quando o trecho tem um só artigo. */
export function rangeLabel(s: { from_label: string; to_label: string }) {
  if (s.from_label === s.to_label) return s.from_label;
  const strip = (l: string) => l.replace(/^(ADCT )?Arts?\.\s*/i, "");
  const adctA = s.from_label.startsWith("ADCT ");
  const adctB = s.to_label.startsWith("ADCT ");
  if (adctA && adctB) return `ADCT, arts. ${strip(s.from_label)} a ${strip(s.to_label)}`;
  if (adctB) return `${s.from_label} até ${s.to_label}`;
  return `Arts. ${strip(s.from_label)} a ${strip(s.to_label)}`;
}

export const TZ = "America/Fortaleza";

export function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function streaks(dates: string[], now = new Date()) {
  const set = new Set(dates);
  const toNum = (k: string) => Math.round(Date.parse(`${k}T12:00:00Z`) / 86400_000);
  const nums = [...set].map(toNum).sort((x, y) => x - y);
  let best = 0;
  let run = 0;
  for (let i = 0; i < nums.length; i++) {
    run = i > 0 && nums[i] === nums[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const today = toNum(dayKey(now));
  const has = new Set(nums);
  let start = has.has(today) ? today : has.has(today - 1) ? today - 1 : null;
  let current = 0;
  while (start !== null && has.has(start)) {
    current++;
    start--;
  }
  return { current, best, today: has.has(today) };
}

