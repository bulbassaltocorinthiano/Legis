// Detecta expressões de prazo em textos normativos para destacá-las em negrito.
// Ex.: "no prazo de 15 (quinze) dias úteis", "dentro de cinco anos", "vinte e quatro horas",
// "até o quinto dia útil", "prazo em dobro". Exclui idades ("maiores de dezoito anos") e penas
// ("reclusão, de dois a oito anos").

const UNITS = [
  "dias?\\s+(?:úteis|uteis|corridos|seguidos|consecutivos)",
  "dias?",
  "horas?",
  "minutos?",
  "semanas?",
  "quinzenas?",
  "m[eê]s(?:es)?",
  "bimestres?",
  "trimestres?",
  "semestres?",
  "anos?",
  "biênios?",
  "triênios?",
  "quinquênios?",
  "decênios?",
];

const UNITS_RE = `(?:${UNITS.join("|")})`;

const WORD_NUMS = [
  "um", "uma", "dois", "duas", "três", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "quatorze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
  "vinte", "trinta", "quarenta", "cinquenta", "cinqüenta", "sessenta", "setenta", "oitenta", "noventa",
  "cem", "cento", "duzentos", "duzentas", "trezentos", "trezentas", "quatrocentos", "quinhentos", "seiscentos",
  "setecentos", "oitocentos", "novecentos", "mil",
];
// número por extenso composto: "vinte e quatro", "cento e oitenta"
const WORD_NUM_RE = `(?:${WORD_NUMS.join("|")})(?:\\s+e\\s+(?:${WORD_NUMS.join("|")}))*`;
// número em algarismos, opcionalmente seguido do extenso entre parênteses: "15 (quinze)"
const DIGIT_NUM_RE = `\\d{1,4}(?:[.,]\\d+)?(?:\\s*\\([^)]{2,40}\\))?`;
const NUM_RE = `(?:${DIGIT_NUM_RE}|${WORD_NUM_RE})`;

const ORDINALS =
  "(?:primeiro|segundo|terceiro|quarto|quinto|sexto|sétimo|oitavo|nono|décimo(?:\\s+\\S+)?|vigésimo(?:\\s+\\S+)?|trigésimo|\\d{1,3}[ºo°])";

const PATTERNS: string[] = [
  // "no prazo (máximo) de 15 (quinze) dias úteis" / "de dois a cinco anos"
  `(?:(?:no|o|do|pelo|em|com)\\s+)?prazos?\\s+(?:máximo\\s+|mínimo\\s+|improrrogável\\s+|comum\\s+|sucessivo\\s+|não\\s+superior\\s+|não\\s+inferior\\s+|de\\s+até\\s+)?(?:de\\s+|a\\s+|até\\s+)?(?:até\\s+)?${NUM_RE}(?:\\s+(?:a|ou|e)\\s+${NUM_RE})?\\s+${UNITS_RE}`,
  // "dentro de cinco dias", "em 48 (quarenta e oito) horas", "após trinta dias", "antes de 10 dias"
  `(?:dentro\\s+de|dentro\\s+do\\s+prazo\\s+de|em\\s+até|até|após|antes\\s+de|depois\\s+de|no\\s+máximo\\s+em|por\\s+mais|por|há\\s+mais\\s+de|há|em)\\s+${NUM_RE}(?:\\s+(?:a|ou|e)\\s+${NUM_RE})?\\s+${UNITS_RE}`,
  // número + unidade solto: "quinze dias", "5 (cinco) anos"
  `${NUM_RE}(?:\\s+(?:a|ou)\\s+${NUM_RE})?\\s+${UNITS_RE}`,
  // "até o quinto dia útil", "no 10º dia"
  `(?:até\\s+o|no|a\\s+partir\\s+do)\\s+${ORDINALS}\\s+dia(?:\\s+útil|\\s+subsequente|\\s+seguinte)?`,
  // "prazo em dobro", "em dobro" ligado a prazo
  `prazos?\\s+(?:em\\s+dobro|em\\s+quádruplo|contado\\s+em\\s+dobro)`,
  // "prazo decadencial/prescricional de"
  `prazos?\\s+(?:decadencia|prescriciona)l\\s+de\\s+${NUM_RE}\\s+${UNITS_RE}`,
  // "vinte e quatro horas" já coberto; "ano-calendário"? não é prazo
];

const PRAZO_RE = new RegExp(PATTERNS.map((p) => `(?:${p})`).join("|"), "giu");

// Contextos que indicam idade ou pena (não destacar)
const AGE_BEFORE = /(maior(?:es)?|menor(?:es)?|idade|idosos?|anos?\s+de\s+idade|aos|com\s+mais\s+de|com\s+menos\s+de|completar|completado|tiver|tenha|tiverem)\s+(?:de\s+|que\s+)?(?:igual\s+ou\s+)?(?:superior\s+a\s+|inferior\s+a\s+)?$/iu;
const AGE_AFTER = /^\s*(?:de\s+idade|completos|incompletos)/iu;
const PENA_BEFORE = /(reclusão|detenção|prisão(?:\s+simples)?|pena)\s*,?\s*(?:de\s+)?$/iu;

export interface Segment {
  text: string;
  prazo: boolean;
}

/** Divide o texto em segmentos marcando os que são prazos. */
export function splitPrazos(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  PRAZO_RE.lastIndex = 0;
  for (let m = PRAZO_RE.exec(text); m; m = PRAZO_RE.exec(text)) {
    const start = m.index;
    const end = start + m[0].length;
    if (m[0].length === 0) {
      PRAZO_RE.lastIndex++;
      continue;
    }
    // fronteira de palavra à esquerda e à direita
    const prev = text[start - 1];
    const next = text[end];
    if ((prev && /[\p{L}\p{N}]/u.test(prev)) || (next && /[\p{L}\p{N}]/u.test(next))) continue;
    const before = text.slice(Math.max(0, start - 40), start);
    const after = text.slice(end, end + 20);
    if (AGE_BEFORE.test(before) || AGE_AFTER.test(after)) continue;
    if (PENA_BEFORE.test(before) || /^de\s/i.test(m[0]) && PENA_BEFORE.test(before)) continue;
    if (/(reclusão|detenção)[^.;]{0,15}$/iu.test(before)) continue;
    if (start > last) out.push({ text: text.slice(last, start), prazo: false });
    out.push({ text: m[0], prazo: true });
    last = end;
  }
  if (last < text.length) out.push({ text: text.slice(last), prazo: false });
  return out;
}

export function hasPrazo(text: string) {
  return splitPrazos(text).some((s) => s.prazo);
}
