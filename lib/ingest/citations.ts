// Extrai citações legislativas ("art. 85, § 2º, do CPC", "arts. 20 e 21 da Lei 8.429/1992")
// e as converte para chaves do catálogo (ex.: LEI-13105-2015) + número do artigo.

export interface Citation {
  normKey: string;
  articleKey: string;
  detail: string | null;
}

const ALIASES: [RegExp, string][] = [
  [/^(?:CPC(?:\/2015|\/15|-15)?|C[óo]digo de Processo Civil(?: de 2015)?)$/i, "LEI-13105-2015"],
  [/^(?:CC(?:\/2002|\/02)?|C[óo]digo Civil(?: de 2002)?)$/i, "LEI-10406-2002"],
  [/^(?:CTN|C[óo]digo Tribut[áa]rio Nacional)$/i, "LEI-5172-1966"],
  [/^(?:CP|C[óo]digo Penal)$/i, "DL-2848-1940"],
  [/^(?:CPP|C[óo]digo de Processo Penal)$/i, "DL-3689-1941"],
  [/^(?:CDC|C[óo]digo de Defesa do Consumidor)$/i, "LEI-8078-1990"],
  [/^(?:CLT|Consolida[çc][ãa]o das Leis do Trabalho)$/i, "DL-5452-1943"],
  [/^(?:ECA|Estatuto da Crian[çc]a e do Adolescente)$/i, "LEI-8069-1990"],
  [/^(?:CF(?:\/88|\/1988)?|Constitui[çc][ãa]o(?: Federal| da Rep[úu]blica)?(?: de 1988)?)$/i, "CF-1988"],
  [/^(?:ADCT)$/i, "CF-1988#adct"],
  [/^(?:LEF|Lei de Execu[çc][ãa]o Fiscal)$/i, "LEI-6830-1980"],
  [/^(?:LEP|Lei de Execu[çc][ãa]o Penal)$/i, "LEI-7210-1984"],
  [/^(?:LINDB)$/i, "DL-4657-1942"],
  [/^(?:LIA|Lei de Improbidade(?: Administrativa)?)$/i, "LEI-8429-1992"],
  [/^(?:CTB|C[óo]digo de Tr[âa]nsito Brasileiro)$/i, "LEI-9503-1997"],
  [/^(?:LRF|Lei de Responsabilidade Fiscal)$/i, "LC-101-2000"],
  [/^(?:Lei Maria da Penha)$/i, "LEI-11340-2006"],
  [/^(?:Lei de Drogas)$/i, "LEI-11343-2006"],
  [/^(?:Estatuto da Pessoa Idosa|Estatuto do Idoso)$/i, "LEI-10741-2003"],
];

const KIND_WORDS: [RegExp, string][] = [
  [/^Lei Complementar$/i, "LC"],
  [/^LC$/i, "LC"],
  [/^Decreto-Lei$/i, "DL"],
  [/^Decreto$/i, "DEC"],
  [/^Lei$/i, "LEI"],
];

function normalizeArt(a: string) {
  return a.replace(/[º°o]/g, "").replace(/\./g, "").toUpperCase();
}

function resolveNormRef(ref: string): string | null {
  const t = ref.trim().replace(/\s+/g, " ");
  for (const [re, key] of ALIASES) if (re.test(t)) return key;
  const m = t.match(/^(Lei Complementar|LC|Decreto-Lei|Decreto|Lei)\s*(?:n[º°.]?\s*|N\.\s*)?(\d[\d.]*)\s*(?:\/|,?\s*de\s*(?:\d{1,2}\s*(?:de\s*)?\w+\s*de\s*)?)(\d{2,4})$/i);
  if (m) {
    const kind = KIND_WORDS.find(([re]) => re.test(m[1]))?.[1] ?? "LEI";
    let year = Number(m[3]);
    if (year < 100) year += year > 30 ? 1900 : 2000;
    return `${kind}-${m[2].replace(/\./g, "")}-${year}`;
  }
  return null;
}

const NORM_REF =
  "(?:CPC(?:\\/2015|\\/15)?|CC(?:\\/2002|\\/02)?|CTN|CPP|CP|CDC|CLT|ECA|CF(?:\\/88|\\/1988)?|ADCT|LEF|LEP|LINDB|LIA|CTB|LRF|C[óo]digo (?:de Processo Civil|Civil|Tribut[áa]rio Nacional|Penal|de Processo Penal|de Defesa do Consumidor|de Tr[âa]nsito Brasileiro)(?: de \\d{4})?|Consolida[çc][ãa]o das Leis do Trabalho|Estatuto da Crian[çc]a e do Adolescente|Estatuto d[oa] (?:Pessoa )?Idos[oa]|Constitui[çc][ãa]o(?: Federal| da Rep[úu]blica)?(?: de 1988)?|Lei de (?:Execu[çc][ãa]o Fiscal|Execu[çc][ãa]o Penal|Improbidade(?: Administrativa)?|Responsabilidade Fiscal|Drogas)|Lei Maria da Penha|(?:Lei Complementar|LC|Decreto-Lei|Decreto|Lei)\\s*(?:n[º°.]?\\s*|N\\.\\s*)?\\d[\\d.]*\\s*(?:\\/\\s*\\d{2,4}|,?\\s*de\\s*(?:\\d{1,2}\\s*(?:de\\s*)?\\w+\\s*de\\s*)?\\d{4}))";

// "art. 85, § 2º, do CPC" | "arts. 20 e 21 da Lei n. 8.429/1992" | "artigo 1.036 do Código de Processo Civil"
const CITE_RE = new RegExp(
  `\\b(?:arts?\\.|artigos?)\\s+((?:\\d[\\d.]*[º°o]?(?:-[A-Z])?(?:\\s*,\\s*(?:§|inc(?:iso)?\\.?|caput|par[áa]grafo)[^,;]{0,25})*(?:\\s*(?:,|e|a)\\s*)?)+)\\s*,?\\s*(?:todos\\s+)?(?:d[oa]s?|n[oa]s?)\\s+(${NORM_REF})`,
  "gi",
);

export function extractCitations(text: string): Citation[] {
  const out: Citation[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(CITE_RE)) {
    let normKey = resolveNormRef(m[2]);
    if (!normKey) continue;
    let prefix = "";
    if (normKey === "CF-1988#adct") {
      normKey = "CF-1988";
      prefix = "adct-";
    }
    const arts = [...m[1].matchAll(/(\d[\d.]*[º°o]?(?:-[A-Z])?)(\s*,\s*(?:§\s*\d+[º°o]?|inc(?:iso)?\.?\s*[IVXLC]+|par[áa]grafo [úu]nico))?/gi)];
    for (const a of arts) {
      const articleKey = prefix + normalizeArt(a[1]);
      const k = `${normKey}|${articleKey}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ normKey, articleKey, detail: a[2] ? a[2].replace(/^\s*,\s*/, "") : null });
    }
  }
  return out;
}

/** Referência estruturada do STJ: "LEG:FED LEI:013105 ANO:2015 ... ART:00787 INC:00001 ART:01022" */
export function parseStjReference(ref: string): Citation[] {
  const m = ref.match(/LEG:FED\s+(\w+):(\S+)\s+ANO:(\d{4})/);
  if (!m) return [];
  const [, tipo, numRaw, ano] = m;
  let normKey: string | null = null;
  const num = numRaw.replace(/^0+/, "");
  switch (tipo) {
    case "CFB":
      normKey = "CF-1988";
      break;
    case "LEI":
      normKey = `LEI-${num}-${ano}`;
      break;
    case "LCP":
      normKey = `LC-${num}-${ano}`;
      break;
    case "DEL":
      normKey = `DL-${num}-${ano}`;
      break;
    case "DEC":
      normKey = `DEC-${num}-${ano}`;
      break;
    case "EMC":
      normKey = `EC-${num}-${ano}`;
      break;
    default:
      return [];
  }
  if (tipo === "CFB" && ano !== "1988") return [];
  const isAdct = /ADCT/i.test(ref);
  const out: Citation[] = [];
  // Divide em grupos "ART:xxxxx (INC|PAR|LET):..."
  const tokens = [...ref.matchAll(/(ART|PAR|INC|LET|ITE|CAP):([\w*]+)/g)];
  let current: Citation | null = null;
  const details: string[] = [];
  const flush = () => {
    if (current) {
      current.detail = details.length ? details.join(", ") : null;
      out.push(current);
    }
    details.length = 0;
  };
  for (const [, t, v] of tokens) {
    if (t === "ART") {
      flush();
      const art = v.replace(/^0+/, "").replace(/^(\d+)([A-Z])$/, "$1-$2");
      current = { normKey, articleKey: (isAdct ? "adct-" : "") + art, detail: null };
    } else if (current) {
      if (t === "PAR") details.push(v === "UNICO" ? "parágrafo único" : `§ ${Number(v)}º`);
      else if (t === "INC") details.push(`inc. ${toRoman(Number(v))}`);
      else if (t === "LET") details.push(`al. ${v.toLowerCase()}`);
    }
  }
  flush();
  return out;
}

function toRoman(n: number) {
  if (!n || n > 3999) return String(n);
  const map: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = "";
  for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
  return s;
}
