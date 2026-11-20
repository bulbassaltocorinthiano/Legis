import { COBRADOS, SOURCES, type CobradoSource, type SourceId } from "./data";

export type { CobradoSource, SourceId };
export { SOURCES };

/** Expande "150-155" e "852-A..852-I" em chaves de artigo individuais. */
export function expandArticles(spec: string): string[] {
  const letters = spec.match(/^(\d+)-([A-Z])\.\.\1-([A-Z])$/);
  if (letters) {
    const [, base, from, to] = letters;
    const out: string[] = [];
    for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c++) out.push(`${base}-${String.fromCharCode(c)}`);
    return out;
  }
  const nums = spec.match(/^(\d+)-(\d+)$/);
  if (nums) {
    const a = Number(nums[1]);
    const b = Number(nums[2]);
    if (b > a) return Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
  }
  return [spec];
}

/** Mapa chave do artigo → fontes que o apontam como mais cobrado, para uma norma. */
export function getCobrados(normKey: string): Map<string, SourceId[]> {
  const map = new Map<string, SourceId[]>();
  for (const [spec, sources] of COBRADOS[normKey] ?? []) {
    for (const art of expandArticles(spec)) {
      const cur = map.get(art) ?? [];
      for (const s of sources) if (!cur.includes(s)) cur.push(s);
      map.set(art, cur);
    }
  }
  return map;
}

/** Texto curto do balão: "Frequente em provas · Gran Cursos (OAB), Curadoria Legis". */
export function cobradoTitle(sources: SourceId[]) {
  const names = sources.map((s) => SOURCES[s].title.split(" — ")[0]);
  return `Artigo frequente em provas · base: ${[...new Set(names)].join(", ")}`;
}
