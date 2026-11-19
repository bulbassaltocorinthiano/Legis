import { CATALOG_TEXT } from "./data";

export type Sphere = "federal" | "estadual-ma";

export interface Category {
  id: number;
  slug: string;
  title: string;
  sphere: Sphere;
}

export interface CatalogNorm {
  key: string; // ex.: "LEI-10406-2002"
  slug: string; // ex.: "lei-10406-2002"
  kind: string; // ex.: "LEI", "LC", "DL", "DEC", "CF"
  number: string | null; // ex.: "10406", "2200-2"
  year: number | null;
  nickname: string | null;
  description: string;
  note: string | null;
  sphere: Sphere;
  categories: number[];
}

const KIND_LABEL: Record<string, string> = {
  CF: "Constituição Federal",
  LEI: "Lei",
  LC: "Lei Complementar",
  DL: "Decreto-Lei",
  DEC: "Decreto",
  EC: "Emenda Constitucional",
  MP: "Medida Provisória",
  "RES-CNJ": "Resolução CNJ",
  "RES-CNMP": "Resolução CNMP",
  "RES-TSE": "Resolução TSE",
  "RES-TCU": "Resolução TCU",
  "RES-SF": "Resolução do Senado Federal",
  "RES-CONAMA": "Resolução Conama",
  "PROV-CNJ": "Provimento CNJ",
  "PORT-INTERMIN": "Portaria Interministerial STN/SOF",
  "PORT-MTP": "Portaria MTP",
  "CE-MA": "Constituição do Estado do Maranhão",
  "LEI-MA": "Lei estadual (MA)",
  "LC-MA": "Lei Complementar estadual (MA)",
  "DEC-MA": "Decreto estadual (MA)",
  "RES-CSMP-MA": "Resolução CSMP-MA",
  "RES-TCEMA": "Resolução TCE-MA",
  "IN-TCEMA": "Instrução Normativa TCE-MA",
  "DN-TCEMA": "Decisão Normativa TCE-MA",
  "IN-SEPLAN-STC": "IN Conjunta SEPLAN/STC",
  "PROV-COGEX-MA": "Provimento COGEX-MA",
  "RES-GP-TJMA": "Resolução-GP TJMA",
  "IN-ITERMA": "Instrução Normativa ITERMA",
  DOC: "Documento",
};

export function kindLabel(kind: string) {
  return KIND_LABEL[kind] ?? kind;
}

export function formatNumber(n: string) {
  // 10406 -> 10.406 ; 2200-2 -> 2.200-2
  const [base, suf] = n.split("-");
  const withDots = base.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return suf ? `${withDots}-${suf}` : withDots;
}

/** Título formal: "Lei nº 10.406/2002" */
export function formalTitle(n: Pick<CatalogNorm, "kind" | "number" | "year" | "description">) {
  if (n.kind === "CF") return "Constituição da República Federativa do Brasil de 1988";
  if (n.kind === "CE-MA") return "Constituição do Estado do Maranhão de 1989";
  if (n.kind === "DOC") return n.description;
  const num = n.number ? formatNumber(n.number) : "";
  return `${kindLabel(n.kind)} nº ${num}${n.year ? `/${n.year}` : ""}`;
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

let cache: { categories: Category[]; norms: CatalogNorm[] } | null = null;

export function loadCatalog() {
  if (cache) return cache;
  const categories: Category[] = [];
  const byKey = new Map<string, CatalogNorm>();
  let current: Category | null = null;

  for (const raw of CATALOG_TEXT.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      const [idStr, title] = line.slice(3).split("|").map((s) => s.trim());
      const id = Number(idStr);
      current = {
        id,
        title,
        slug: slugify(title),
        sphere: id >= 15 ? "estadual-ma" : "federal",
      };
      categories.push(current);
      continue;
    }
    if (!current) throw new Error(`Linha fora de categoria: ${line}`);
    const parts = line.split("|").map((s) => s.trim());
    const [head, nickname, description, note] = parts;
    const [kind, ident] = head.split(/\s+/);
    let number: string | null = null;
    let year: number | null = null;
    if (kind === "CF" || kind === "CE-MA") {
      year = Number(ident);
    } else if (kind === "DOC") {
      number = ident;
    } else {
      const m = ident.match(/^([\d-]+)\/(\d{4})$/);
      if (!m) throw new Error(`Identificador inválido: ${line}`);
      number = m[1];
      year = Number(m[2]);
    }
    const key = [kind, number, year].filter(Boolean).join("-");
    const existing = byKey.get(key);
    if (existing) {
      if (!existing.categories.includes(current.id)) existing.categories.push(current.id);
      if (!existing.nickname && nickname) existing.nickname = nickname;
      continue;
    }
    byKey.set(key, {
      key,
      slug: slugify(key),
      kind,
      number,
      year,
      nickname: nickname || null,
      description: description ?? "",
      note: note ?? null,
      sphere: kind.endsWith("-MA") || kind.includes("TCEMA") || kind.includes("TJMA") || kind.startsWith("DOC") || kind.includes("ITERMA") || kind.includes("SEPLAN") ? "estadual-ma" : "federal",
      categories: [current.id],
    });
  }
  cache = { categories, norms: [...byKey.values()] };
  return cache;
}
