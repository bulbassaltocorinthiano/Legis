// Localiza termos da biblioteca doutrinária dentro do texto legal.
export interface TermRef {
  slug: string;
  term: string;
  aliases: string[];
  area: string;
}

// Em quais áreas do catálogo cada área doutrinária é sublinhada automaticamente.
// (A consulta por seleção/duplo clique funciona em qualquer lei.)
const AREA_CATEGORIES: Record<string, number[]> = {
  Civil: [5, 7, 13, 6, 9],
  "Família": [5, 13, 9],
  "Sucessões": [5, 13],
  "Processo Civil": [6, 1, 9, 4, 14],
  "Processo Coletivo": [6, 1, 9, 10],
  Constitucional: [1, 3, 12, 15],
  Administrativo: [2, 3, 12, 16, 17, 10],
  Penal: [8],
  "Processo Penal": [8],
  "Execução Penal": [8],
  "Tributário": [4, 18],
  Trabalho: [14],
  "Previdenciário": [14],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface TermMatcher {
  re: RegExp | null;
  lookup: Map<string, string>; // forma minúscula -> slug
  caseSensitive: Map<string, string>; // siglas (ex.: "ANPP")
}

export function buildMatcher(terms: TermRef[], categoryIds: number[]): TermMatcher {
  const lookup = new Map<string, string>();
  const caseSensitive = new Map<string, string>();
  const forms: string[] = [];
  for (const t of terms) {
    const cats = AREA_CATEGORIES[t.area];
    if (cats && !cats.some((c) => categoryIds.includes(c))) continue;
    for (const f of [t.term, ...t.aliases]) {
      const isAcronym = /^[A-Z]{2,6}$/.test(f);
      if (isAcronym) {
        if (f.length < 3) continue; // "MS", "RE", "HC" geram falsos positivos
        caseSensitive.set(f, t.slug);
      } else {
        if (f.length < 4) continue;
        lookup.set(f.toLowerCase(), t.slug);
      }
      forms.push(f);
    }
  }
  if (!forms.length) return { re: null, lookup, caseSensitive };
  forms.sort((a, b) => b.length - a.length);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${forms.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return { re, lookup, caseSensitive };
}

export interface TermSegment {
  text: string;
  slug?: string;
}

/** Marca termos; `seen` evita sublinhar o mesmo termo várias vezes no mesmo artigo. */
export function splitTerms(text: string, m: TermMatcher, seen: Set<string>): TermSegment[] {
  if (!m.re) return [{ text }];
  const out: TermSegment[] = [];
  let last = 0;
  m.re.lastIndex = 0;
  for (let r = m.re.exec(text); r; r = m.re.exec(text)) {
    const found = r[0];
    const slug = m.caseSensitive.get(found) ?? (/^[A-Z]{2,6}$/.test(found) ? undefined : m.lookup.get(found.toLowerCase()));
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    if (r.index > last) out.push({ text: text.slice(last, r.index) });
    out.push({ text: found, slug });
    last = r.index + found.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
