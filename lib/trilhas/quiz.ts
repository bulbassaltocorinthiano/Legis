// Gerador de questionários a partir do texto oficial lido na semana.
// Determinístico (mesma semente + mesmo texto = mesmas questões), para a correção ser feita no servidor
// sem precisar guardar as questões. As respostas vêm sempre do próprio texto da lei.
import { splitPrazos } from "../text/prazos";

export interface QuizNode {
  kind: string;
  label: string | null;
  text: string;
  anchor: string;
  article_key: string | null;
  revoked: boolean;
}

export interface QuizSource {
  slug: string;
  normTitle: string;
  nodes: QuizNode[];
}

export type QuestionType = "prazo" | "rubrica" | "pena" | "artigo";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  quote?: string;
  options: string[];
  answer: number;
  ref: { slug: string; anchor: string; label: string; norm: string };
}

export type PublicQuestion = Omit<Question, "answer">;

const TYPE_PROMPT: Record<QuestionType, string> = {
  prazo: "Complete com o prazo correto",
  rubrica: "Qual artigo trata do tema abaixo?",
  pena: "Qual é a pena prevista?",
  artigo: "A qual artigo pertence o texto abaixo?",
};

function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], r: () => number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const W: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, "três": 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, "cinqüenta": 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quinhentos: 500, mil: 1000,
};
const UNIT_RE = "(?:dias?(?:\\s+(?:úteis|corridos))?|horas?|minutos?|semanas?|m[eê]s(?:es)?|anos?)";
const CORE_RE = new RegExp(`((?:\\d{1,4}(?:\\s*\\([^)]{2,40}\\))?|[a-záéíóúâêôãõçü]+(?:\\s+e\\s+[a-záéíóúâêôãõçü]+)*)\\s+${UNIT_RE})$`, "iu");

/** Parte "número + unidade" de um prazo ("no prazo de 15 (quinze) dias" -> "15 (quinze) dias"). */
export function prazoCore(p: string) {
  const m = p.trim().match(CORE_RE);
  if (!m) return null;
  const words = m[1].toLowerCase().split(/\s+/);
  const firstNum = /^\d/.test(words[0]) || W[words[0]] !== undefined;
  return firstNum ? m[1] : null;
}

/** Chave de equivalência: "2 (dois) anos" e "dois anos" => "2|ano". */
export function prazoKey(core: string) {
  const unit = /hora/i.test(core) ? "hora" : /minuto/i.test(core) ? "min" : /semana/i.test(core) ? "sem" : /m[eê]s/i.test(core) ? "mes" : /ano/i.test(core) ? "ano" : /útei/i.test(core) ? "du" : "dia";
  const d = core.match(/^\d{1,4}/);
  let v = d ? Number(d[0]) : 0;
  if (!d) for (const w of core.toLowerCase().split(/\s+/)) if (W[w] !== undefined) v += W[w];
  return `${v}|${unit}`;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[.;:,]+$/, "").trim();

const COMMON_PRAZOS: Record<string, string[]> = {
  dia: ["5 (cinco) dias", "10 (dez) dias", "15 (quinze) dias", "30 (trinta) dias", "60 (sessenta) dias", "90 (noventa) dias", "48 (quarenta e oito) horas"],
  hora: ["24 (vinte e quatro) horas", "48 (quarenta e oito) horas", "72 (setenta e duas) horas", "5 (cinco) dias"],
  mes: ["3 (três) meses", "6 (seis) meses", "1 (um) ano", "30 (trinta) dias", "12 (doze) meses"],
  ano: ["1 (um) ano", "2 (dois) anos", "3 (três) anos", "4 (quatro) anos", "5 (cinco) anos", "10 (dez) anos", "20 (vinte) anos"],
};

function unitOf(p: string) {
  if (/hora/i.test(p)) return "hora";
  if (/m[eê]s/i.test(p)) return "mes";
  if (/ano|biênio|triênio|quinquênio|decênio/i.test(p)) return "ano";
  return "dia";
}

/** Escolhe 3 distratores distintos da resposta, preferindo os do próprio texto da semana. */
function distractors(correct: string, pool: string[], fallback: string[], r: () => number, key: (s: string) => string = norm) {
  const seen = new Set([key(correct)]);
  const out: string[] = [];
  for (const c of [...shuffle(pool, r), ...shuffle(fallback, r)]) {
    const k = key(c);
    if (seen.has(k) || !c.trim()) continue;
    seen.add(k);
    out.push(c);
    if (out.length === 3) break;
  }
  return out;
}

function clip(s: string, max = 320) {
  return s.length <= max ? s : s.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

interface Article {
  key: string;
  label: string;
  anchor: string;
  caput: string;
  rubrica: string | null;
  pena: string | null;
  src: QuizSource;
}

function collectArticles(src: QuizSource): Article[] {
  const out: Article[] = [];
  let pendingRubrica: string | null = null;
  let cur: Article | null = null;
  for (const n of src.nodes) {
    if (n.kind === "rubrica") {
      pendingRubrica = n.text.trim() || null;
      continue;
    }
    if (n.kind === "artigo" && n.article_key && !n.revoked) {
      cur = { key: n.article_key, label: n.label ?? `Art. ${n.article_key}`, anchor: n.anchor, caput: n.text, rubrica: pendingRubrica, pena: null, src };
      out.push(cur);
      pendingRubrica = null;
      continue;
    }
    if (n.kind === "artigo") cur = null;
    if (cur && n.kind === "pena" && !cur.pena && n.article_key === cur.key) cur.pena = n.text.trim().replace(/\.{2,}$/, ".");
    if (!["rubrica"].includes(n.kind) && n.kind !== "pena") {
      // rubrica só vale para o artigo logo a seguir
      if (n.kind !== "artigo") pendingRubrica = n.kind === "paragrafo" ? null : pendingRubrica;
    }
  }
  return out;
}

export function buildQuiz(sources: QuizSource[], seed: number, size = 10): Question[] {
  const r = rng(seed);
  const articles = sources.flatMap(collectArticles);
  if (!articles.length) return [];
  const labelOf = (a: Article) => (sources.length > 1 ? `${a.src.normTitle}, ${a.label}` : a.label);
  const ref = (a: Article, anchor = a.anchor) => ({ slug: a.src.slug, anchor, label: a.label, norm: a.src.normTitle });
  const otherLabels = (a: Article) => articles.filter((b) => b !== a && b.src === a.src).map(labelOf);

  // ---- prazos ----
  const prazoCands: { a: Article; anchor: string; label: string; text: string; prazo: string; idx: number }[] = [];
  const prazoPool: string[] = [];
  let curArt: Article | null = null;
  for (const src of sources) {
    const arts = new Map(collectArticles(src).map((a) => [a.anchor, a]));
    for (const n of src.nodes) {
      if (n.kind === "artigo") curArt = arts.get(n.anchor) ?? null;
      if (!curArt || n.revoked || !n.text || n.article_key !== curArt.key) continue;
      const segs = splitPrazos(n.text);
      segs.forEach((s, i) => {
        if (!s.prazo) return;
        const core = prazoCore(s.text);
        if (!core) return;
        prazoPool.push(core);
        if (n.text.length < 700) prazoCands.push({ a: curArt!, anchor: n.anchor, label: n.label ?? curArt!.label, text: n.text, prazo: core, idx: i });
      });
    }
  }
  const prazoQs: Question[] = shuffle(prazoCands, r).map((c, i) => {
    const segs = splitPrazos(c.text);
    const full = segs[c.idx].text;
    const lead = full.slice(0, full.length - c.prazo.length);
    const before = segs.slice(0, c.idx).map((s) => s.text).join("") + lead;
    const after = segs.slice(c.idx + 1).map((s) => s.text).join("");
    const u = prazoKey(c.prazo).split("|")[1];
    const same = prazoPool.filter((p) => prazoKey(p).split("|")[1] === u);
    const opts = [c.prazo, ...distractors(c.prazo, same, [...COMMON_PRAZOS[unitOf(c.prazo)], ...prazoPool], r, prazoKey)];
    const order = shuffle(opts.map((_, k) => k), r);
    const where = c.label === c.a.label ? c.a.label : `${c.a.label}, ${c.label}`;
    return {
      id: `p${i}`,
      type: "prazo" as const,
      prompt: `${TYPE_PROMPT.prazo} (${sources.length > 1 ? `${c.a.src.normTitle}, ` : ""}${where})`,
      quote: clip(`${before.slice(-220)}_____${after.slice(0, 160)}`.trim(), 420),
      options: order.map((k) => opts[k]),
      answer: order.indexOf(0),
      ref: ref(c.a, c.anchor),
    };
  });

  // ---- rubrica -> artigo ----
  const rubCount = new Map<string, number>();
  for (const a of articles) if (a.rubrica) rubCount.set(norm(a.rubrica), (rubCount.get(norm(a.rubrica)) ?? 0) + 1);
  const GENERIC = /disposi[çc]|comuns?$|gerais|aumento de pena|qualificad|causa de|^pena|forma culposa|ação penal|isenção|^parágrafo/i;
  const rubricaQs: Question[] = shuffle(
    articles.filter((a) => a.rubrica && a.rubrica.length < 90 && rubCount.get(norm(a.rubrica)) === 1 && !GENERIC.test(a.rubrica) && otherLabels(a).length >= 3),
    r,
  ).map((a, i) => {
    const opts = [labelOf(a), ...distractors(labelOf(a), otherLabels(a), [], r)];
    const order = shuffle(opts.map((_, k) => k), r);
    return { id: `r${i}`, type: "rubrica" as const, prompt: TYPE_PROMPT.rubrica, quote: a.rubrica!, options: order.map((k) => opts[k]), answer: order.indexOf(0), ref: ref(a) };
  });

  // ---- pena ----
  const penaPool = articles.map((a) => a.pena).filter((p): p is string => !!p);
  const penaQs: Question[] = shuffle(
    articles.filter((a) => a.pena && new Set(penaPool.map(norm)).size >= 4),
    r,
  ).map((a, i) => {
    const opts = [a.pena!, ...distractors(a.pena!, penaPool, [], r)];
    const order = shuffle(opts.map((_, k) => k), r);
    return {
      id: `n${i}`,
      type: "pena" as const,
      prompt: `${TYPE_PROMPT.pena} (${labelOf(a)}${a.rubrica ? ` · ${a.rubrica}` : ""})`,
      quote: clip(a.caput, 260),
      options: order.map((k) => opts[k]),
      answer: order.indexOf(0),
      ref: ref(a),
    };
  });

  // ---- texto -> artigo ----
  const artigoQs: Question[] = shuffle(
    articles.filter((a) => a.caput.length >= 50 && otherLabels(a).length >= 3),
    r,
  ).map((a, i) => {
    const opts = [labelOf(a), ...distractors(labelOf(a), otherLabels(a), [], r)];
    const order = shuffle(opts.map((_, k) => k), r);
    return { id: `a${i}`, type: "artigo" as const, prompt: TYPE_PROMPT.artigo, quote: clip(a.caput, 280), options: order.map((k) => opts[k]), answer: order.indexOf(0), ref: ref(a) };
  });

  // intercala os tipos: prazos têm prioridade (são os mais cobrados em prova)
  const queues = [prazoQs, penaQs, rubricaQs, artigoQs, prazoQs];
  const out: Question[] = [];
  const used = new Set<string>();
  let guard = 0;
  while (out.length < size && queues.some((q) => q.length) && guard++ < 500) {
    for (const q of queues) {
      const next = q.shift();
      if (!next || next.options.length < 2) continue;
      const k = `${next.ref.slug}#${next.ref.anchor}:${next.type}`;
      if (used.has(k)) continue;
      used.add(k);
      out.push(next);
      if (out.length >= size) break;
    }
  }
  return out.map((q, i) => ({ ...q, id: `q${i + 1}` }));
}

export function gradeQuiz(questions: Question[], answers: number[]) {
  const results = questions.map((q, i) => ({ id: q.id, chosen: Number.isInteger(answers[i]) ? answers[i] : -1, answer: q.answer, correct: answers[i] === q.answer }));
  return { score: results.filter((x) => x.correct).length, total: questions.length, results };
}
