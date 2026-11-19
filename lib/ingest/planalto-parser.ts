// Converte o HTML do Planalto (texto compilado) em dispositivos estruturados com o texto VIGENTE.
// Regras principais:
//  - Trechos tachados (<strike>, <s>, <del>, line-through) são redações antigas e são descartados.
//  - Anotações como "(Redação dada pela Lei nº ...)" são separadas do texto e guardadas como notas.
//  - Cada bloco é classificado como título/capítulo/seção, artigo, parágrafo, inciso, alínea, item, pena etc.
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";

export type NodeKind =
  | "epigrafe"
  | "ementa"
  | "preambulo"
  | "parte"
  | "livro"
  | "titulo"
  | "subtitulo"
  | "capitulo"
  | "secao"
  | "subsecao"
  | "rubrica"
  | "artigo"
  | "paragrafo"
  | "inciso"
  | "alinea"
  | "item"
  | "pena"
  | "texto"
  | "fecho";

export interface ParsedNode {
  ord: number;
  kind: NodeKind;
  label: string | null; // "Art. 5º", "§ 1º", "I", "a)"
  text: string; // texto vigente sem rótulo e sem anotações
  heading: string | null; // nome do título/capítulo, quando houver
  notes: string[]; // "(Redação dada pela Lei nº 13.874, de 2019)"
  articleKey: string | null; // "5", "1.036-A" → "1036-A", "adct-10"
  anchor: string;
  revoked: boolean;
  level: number; // profundidade para indentação
}

export interface ParsedNorm {
  epigrafe: string | null;
  ementa: string | null;
  nodes: ParsedNode[];
  contentHash: string;
  articleCount: number;
}

const NOTE_WORDS =
  "Reda[çc][ãa]o\\s+dada|Inclu[íi]d[oa]|Acrescid[oa]|Acrescentad[oa]|Revogad[oa]|Revoga[çc][ãa]o|Vide|Renumerad[oa]|Vig[êe]ncia|Regulamento|Regulamenta[çc][ãa]o|Promulga[çc][ãa]o|Produ[çc][ãa]o\\s+de\\s+efeito|Suprimid[oa]|Vetad[oa]|VETAD[OA]|Declarad[oa]|Execu[çc][ãa]o\\s+suspensa|Transformad[oa]|Express[ãa]o|Convers[ãa]o|Restabelecid[oa]|Prorrogad[oa]|Em\\s+vigor|Com\\s+reda[çc][ãa]o|Alterad[oa]|Mantid[oa]|Inconstitucional|Revigorad[oa]|Retificad[oa]|Ratificad[oa]|Partes?\\s+mantid|Efic[áa]cia|Suspens[oa]|Ver\\s+|ADI|ADC|ADPF|Medida\\s+Provis[óo]ria|Lei\\s+n|Emenda\\s+Constitucional|Mensagem\\s+de\\s+veto|Atualizad|Texto\\s+compilado";
const NOTE_RE = new RegExp(`\\((?:\\s*)(?:${NOTE_WORDS})[^()]*(?:\\([^()]*\\)[^()]*)*\\)`, "g");
const TRAILING_NOTE_WORDS = /(?:\s+(?:Vig[êe]ncia|Regulamento|Produ[çc][ãa]o\s+de\s+efeitos?|Mensagem\s+de\s+veto|Convers[ãa]o|Promulga[çc][ãa]o|Vide\s+[^.;]*|Texto\s+compilado))+\s*$/i;

const ROMAN = "[IVXLCDM]+";
const HEADER_JUNK = /^(Presid[êe]ncia\s+da\s+Rep[úu]blica|Casa\s+Civil|Subchefia|Secretaria[-\s]Geral|Secretaria\s+Especial|Vide\b|Texto\s+compilado|Mensagem\s+de\s+veto|[ÍI]NDICE|Emendas\s+Constitucionais|Atos\s+decorrentes|Vig[êe]ncia|Convers[ãa]o|Regulamento|Produ[çc][ãa]o\s+de\s+efeito|Promulga[çc][ãa]o|Retifica|Republica|Revogad|\(|Ato\s+das\s+Disposi)/i;

function clean(s: string) {
  return s
    .replace(/ /g, " ")
    .replace(/[​­]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitNotes(text: string): { body: string; notes: string[] } {
  const notes: string[] = [];
  let body = text.replace(NOTE_RE, (m) => {
    notes.push(clean(m));
    return " ";
  });
  // palavras soltas de link ao fim ("Vigência", "Regulamento")
  const t = body.match(TRAILING_NOTE_WORDS);
  if (t) {
    notes.push(clean(t[0]));
    body = body.slice(0, t.index);
  }
  return { body: clean(body), notes };
}

const ORDINAL_WORDS: Record<string, number> = {
  primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5, sexto: 6, "sétimo": 7, setimo: 7, oitavo: 8, nono: 9,
  "décimo": 10, decimo: 10,
};
/** "Artigo Primeiro" / "ARTIGO DÉCIMO SEGUNDO" -> "Artigo 1º" / "Artigo 12º" (tratados promulgados por decreto) */
function normalizeOrdinalArticle(b: string) {
  const m = b.match(/^(Artigo|ARTIGO)\s+((?:d[ée]cimo|vig[ée]simo|trig[ée]simo)?\s*(?:primeiro|segundo|terceiro|quarto|quinto|sexto|s[ée]timo|oitavo|nono)?|d[ée]cimo|vig[ée]simo|trig[ée]simo)\b(.*)$/i);
  if (!m || !m[2].trim()) return b;
  const words = m[2].toLowerCase().trim().split(/\s+/);
  let n = 0;
  for (const w of words) {
    if (/^d[ée]cimo$/.test(w)) n += 10;
    else if (/^vig[ée]simo$/.test(w)) n += 20;
    else if (/^trig[ée]simo$/.test(w)) n += 30;
    else n += ORDINAL_WORDS[w] ?? 0;
  }
  return n ? `${m[1]} ${n}º${m[3]}` : b;
}

function normalizeArticleNumber(raw: string) {
  // "1.036-A" -> "1036-A" ; "5º" -> "5"
  return raw.replace(/[º°o]/g, "").replace(/\./g, "").replace(/\s+/g, "").toUpperCase().replace(/-+$/, "");
}

const HEADING_RES: [NodeKind, RegExp][] = [
  ["parte", /^(PARTE\s+(GERAL|ESPECIAL|[A-ZÇÃÉÍÓÚ]+)|PARTE\s+[IVX]+)\b/i],
  ["livro", /^LIVRO\s+(\S+)/i],
  ["titulo", /^T[ÍI]TULO\s+(\S+)/i],
  ["subtitulo", /^SUBT[ÍI]TULO\s+(\S+)/i],
  ["capitulo", /^CAP[ÍI]TULO\s+(\S+)/i],
  ["secao", /^SE[ÇC][ÃA]O\s+(\S+)/i],
  ["subsecao", /^SUBSE[ÇC][ÃA]O\s+(\S+)/i],
];

const HEADING_LEVEL: Partial<Record<NodeKind, number>> = {
  parte: 0,
  livro: 1,
  titulo: 2,
  subtitulo: 3,
  capitulo: 3,
  secao: 4,
  subsecao: 5,
};

function isHeadingKind(k: NodeKind) {
  return k in HEADING_LEVEL;
}

/** Extrai os blocos de texto do HTML, já sem os trechos tachados. */
export function extractBlocks(html: string, opts: { keepStruck?: boolean } = {}): string[] {
  const $ = cheerio.load(html);
  $("script, style, head").remove();
  // Dispositivo inteiramente tachado e marcado "(Revogado ...)": mantém só o rótulo ("Art. 79"),
  // para o leitor ver que o artigo existe e foi revogado (como no Planalto).
  const LABEL_RE = /^\s*(Art(?:igo)?\s*\.?\s*\d[\d.]*\s*[º°o]?(?:\s*-\s*[A-Z]{1,3}\b)?\s*\.?|§\s*\d+\s*[º°o]?(?:-[A-Z])?|Par[áa]grafo\s+[úu]nico\.?|[IVXLCDM]+(?:-[A-Z])?\s*[-–—]|[a-z]\))/;
  if (!opts.keepStruck) $("p").each((_, p) => {
    const $p = $(p);
    const strikes = $p.find("strike, s, del");
    if (!strikes.length) return;
    const clone = $p.clone();
    clone.find("strike, s, del").remove();
    const rest = clone.text().replace(/\s+/g, " ").trim();
    if (!/revogad/i.test(rest) || LABEL_RE.test(rest)) return;
    for (const el of strikes.toArray()) {
      const t = $(el).text().replace(/\u00a0/g, " ");
      if (!t.trim()) continue;
      const m = t.match(LABEL_RE);
      if (m) $(el).replaceWith(`${m[1].trim()} `);
      break;
    }
  });
  if (!opts.keepStruck) {
    $("strike, s, del").remove();
    $("[style]").each((_, el) => {
      const st = ($(el).attr("style") || "").toLowerCase();
      if (st.includes("line-through")) $(el).remove();
    });
  }
  // "1<sup>o</sup>" -> "1º"
  $("sup").each((_, el) => {
    const t = $(el).text().trim();
    if (/^[oº°a]$/i.test(t)) $(el).replaceWith(t.toLowerCase() === "a" ? "ª" : "º");
  });
  $("br").replaceWith("\u2028");
  const blocks: string[] = [];
  // Blocos de nível de parágrafo; tabelas são lidas célula a célula (anexos/tabelas simples).
  $("p, h1, h2, h3, h4, h5, h6, li, td").each((_, el) => {
    const $el = $(el);
    // evita duplicar quando há <p> dentro de <td>
    if (el.tagName === "td" && $el.find("p").length) return;
    const raw = $el.text();
    for (const piece of raw.split("\u2028")) {
      const t = clean(piece);
      if (t) blocks.push(t);
    }
  });
  return blocks;
}

export function parsePlanaltoHtml(html: string, opts: { isConstitution?: boolean; keepStruck?: boolean } = {}): ParsedNorm {
  const blocks = extractBlocks(html, { keepStruck: opts.keepStruck }).map(normalizeOrdinalArticle);
  const nodes: ParsedNode[] = [];
  let epigrafe: string | null = null;
  let ementa: string | null = null;
  let seenFirstArticle = false;
  let currentArticle: string | null = null;
  let articlePrefix = "";
  let ended = false;
  let ord = 0;
  let pendingHeading: ParsedNode | null = null;
  const anchors = new Set<string>();
  let lastParagraphAnchor: string | null = null;
  let lastIncisoAnchor: string | null = null;
  let lastAlineaAnchor: string | null = null;
  let inQuote = false; // dentro de texto citado (lei que altera outra: “Art. 288. ...” (NR))
  let awaitCaput: ParsedNode | null = null; // "Artigo 1º" sozinho numa linha, texto na linha seguinte

  const uniqueAnchor = (base: string) => {
    let a = base;
    let i = 2;
    while (anchors.has(a)) a = `${base}-${i++}`;
    anchors.add(a);
    return a;
  };

  const push = (n: Omit<ParsedNode, "ord">) => {
    const node = { ...n, ord: ord++ };
    if (awaitCaput && node.kind !== "artigo") {
      // o artigo tinha só o rótulo e veio direto um parágrafo/inciso: segue sem caput
      awaitCaput = null;
    }
    if (node.text && node.text.replace(/[.;,:\s]/g, "") === "") {
      node.text = "";
      if (["artigo", "paragrafo", "inciso", "alinea", "item"].includes(node.kind)) node.revoked = true;
    }
    nodes.push(node);
    return node;
  };

  for (let i = 0; i < blocks.length; i++) {
    const rawBlock = blocks[i];
    const { body, notes } = splitNotes(rawBlock);

    // Cabeçalho antes do primeiro artigo
    if (!seenFirstArticle) {
      if (!epigrafe && /^(LEI|DECRETO|MEDIDA|EMENDA|CONSTITUI|RESOLU)/i.test(body) && /\d/.test(body) && body.length < 200) {
        epigrafe = body;
        push({ kind: "epigrafe", label: null, text: body, heading: null, notes, articleKey: null, anchor: uniqueAnchor("epigrafe"), revoked: false, level: 0 });
        continue;
      }
    }

    // Fecho: "Brasília, 10 de janeiro de 2002; 181º da Independência..."
    if (seenFirstArticle && /^(Bras[íi]lia|Rio de Janeiro|Palácio|Pal[áa]cio do Planalto),?\s/i.test(body) && /\d{4}/.test(body) && body.length < 300) {
      push({ kind: "fecho", label: null, text: body, heading: null, notes, articleKey: null, anchor: uniqueAnchor("fecho"), revoked: false, level: 0 });
      // Depois do fecho vêm assinaturas. Na CF, o ADCT recomeça a leitura (ver acima).
      ended = true;
      continue;
    }

    // ADCT na Constituição (só depois do corpo principal; no topo há um link de navegação com o mesmo nome)
    if (opts.isConstitution && seenFirstArticle && /^ATO\s+DAS\s+DISPOSI[ÇC][ÕO]ES\s+CONSTITUCIONAIS\s+TRANSIT[ÓO]RIAS/i.test(body)) {
      articlePrefix = "adct-";
      ended = false;
      push({ kind: "parte", label: null, text: "", heading: "Ato das Disposições Constitucionais Transitórias", notes, articleKey: null, anchor: uniqueAnchor("adct"), revoked: false, level: 0 });
      continue;
    }

    // Texto anexo após o fecho (ex.: CLT anexa ao DL 5.452, regulamentos e convenções promulgadas por decreto):
    // um novo "Art. 1" reinicia a leitura. Os artigos do ato de aprovação recebem o prefixo "aprov-".
    if (ended && !opts.isConstitution && /^Art(?:igo)?\s*\.?\s*1\s*[º°o]?(?![\d.])/i.test(body)) {
      ended = false;
      for (const nd of nodes) {
        if (nd.articleKey && !nd.articleKey.startsWith("aprov-")) {
          anchors.delete(nd.anchor);
          nd.articleKey = `aprov-${nd.articleKey}`;
          nd.anchor = `aprov-${nd.anchor}`;
          anchors.add(nd.anchor);
        }
      }
      push({ kind: "parte", label: null, text: "", heading: "Anexo", notes: [], articleKey: null, anchor: uniqueAnchor("anexo"), revoked: false, level: 0 });
    }

    if (ended) continue;

    // Títulos estruturais
    let matchedHeading: NodeKind | null = null;
    for (const [k, re] of HEADING_RES) {
      if (re.test(body) && body.length < 220 && !/^Art/i.test(body)) {
        matchedHeading = k;
        break;
      }
    }
    if (matchedHeading) {
      // "CAPÍTULO I - DAS PESSOAS" ou "CAPÍTULO I" + bloco seguinte com o nome
      const m = body.match(/^(\S+\s+\S+)\s*(?:[-–—:]\s*)?(.*)$/);
      const label = m ? clean(m[1]) : body;
      let name = m && m[2] ? clean(m[2]) : "";
      if (!name && i + 1 < blocks.length) {
        const nxt = splitNotes(blocks[i + 1]).body;
        if (nxt && nxt.length < 200 && !/^(Art\s*\.?\s|§|Par[áa]grafo|[IVXLC]+\s*[-–—])/i.test(nxt) && !HEADING_RES.some(([, re]) => re.test(nxt))) {
          name = nxt;
          i++;
        }
      }
      const revoked = !name && notes.some((n) => /revogad/i.test(n));
      pendingHeading = push({
        kind: matchedHeading,
        label,
        text: "",
        heading: name || null,
        notes,
        articleKey: null,
        anchor: uniqueAnchor(`${articlePrefix}${matchedHeading}-${label.split(/\s+/)[1] ?? ord}`.toLowerCase()),
        revoked,
        level: HEADING_LEVEL[matchedHeading] ?? 0,
      });
      continue;
    }

    // Texto citado de outra norma (alterações): não é dispositivo desta lei
    const opensQuote = /^[“"]/.test(body);
    if (seenFirstArticle && (inQuote || opensQuote)) {
      const closes = /[”"]\s*(?:\((?:NR|AC|VETADO)\))?\s*$/i.test(body) && !(opensQuote && body.length < 3);
      inQuote = !closes;
      push({ kind: "texto", label: null, text: body, heading: null, notes, articleKey: currentArticle, anchor: uniqueAnchor(`${currentArticle ? `art${currentArticle}` : "x"}-cit`), revoked: false, level: 1 });
      awaitCaput = null;
      continue;
    }

    // Intervalo de artigos revogados: "Arts. 1.620 a 1.629. (Revogados pela Lei nº 12.010, de 2009)"
    const arts = body.match(/^Arts?\.?\s*(\d+(?:\.\d{3})*)\s*[º°]?\.?\s*(?:a|e|até)\s*(\d+(?:\.\d{3})*)\s*[º°]?\s*[.\-–—:]?\s*/);
    if (arts) {
      seenFirstArticle = true;
      const from = normalizeArticleNumber(arts[1]);
      currentArticle = `${articlePrefix}${from}`;
      lastParagraphAnchor = lastIncisoAnchor = lastAlineaAnchor = null;
      const text = clean(body.slice(arts[0].length));
      push({
        kind: "artigo",
        label: `Arts. ${arts[1]} a ${arts[2]}`,
        text,
        heading: null,
        notes,
        articleKey: currentArticle,
        anchor: uniqueAnchor(`art${currentArticle.replace(/^adct-/, "adct")}`.toLowerCase()),
        revoked: !text || isOnlyRevoked(notes, text),
        level: 0,
      });
      continue;
    }

    // Artigo
    const art = body.match(/^(?:Art|ART|Artigo|ARTIGO)\s*\.?\s*(\d+(?:\.\d{3})*(?:\s*[º°]|o(?=[\s.\-–—]))?(?:-[A-Z]{1,3}\b)?|[úÚuU]nico|ÚNICO)\s*[.\-–—:]?\s*/);
    if (art) {
      seenFirstArticle = true;
      const num = /^[úu]nico$/i.test(art[1]) ? "1" : normalizeArticleNumber(art[1]);
      currentArticle = `${articlePrefix}${num}`;
      lastParagraphAnchor = lastIncisoAnchor = lastAlineaAnchor = null;
      const text = clean(body.slice(art[0].length));
      const labelNum = /^[úu]nico$/i.test(art[1]) ? "único" : art[1].replace(/\s+/g, "").replace(/o$/, "º");
      push({
        kind: "artigo",
        label: `Art. ${labelNum}${/\d$/.test(labelNum) && Number(num) >= 10 ? "" : ""}`,
        text,
        heading: null,
        notes,
        articleKey: currentArticle,
        anchor: uniqueAnchor(`art${currentArticle.replace(/^adct-/, "adct")}`.toLowerCase()),
        revoked: (!text && notes.some((x) => /revogad|vetad/i.test(x))) || /^\(?revogad/i.test(text) || isOnlyRevoked(notes, text),
        level: 0,
      });
      awaitCaput = !text && !nodes[nodes.length - 1].revoked ? nodes[nodes.length - 1] : null;
      pendingHeading = null;
      continue;
    }

    // Rubrica (título do artigo em códigos, ex.: "Homicídio simples") — linha curta antes de um artigo
    const nextBody = i + 1 < blocks.length ? splitNotes(blocks[i + 1]).body : "";
    const looksLikeRubrica = body.length > 1 && body.length < 90 && /^[A-ZÀ-Ý]/.test(body) && !/[.;:,]$/.test(body) && !/^([IVXLCDM]+(?:-[A-Z])?\s*[-–—]|§|Art\s*\.?\s*\d|Par[áa]grafo\s+[úu]nico|Pena\s*[-–—])/i.test(body);
    if (
      looksLikeRubrica &&
      ((seenFirstArticle && /^(Art\s*\.?\s*\d|§|Par[áa]grafo|Pena\s*[-–—]|[IVXLC]+\s*[-–—])/i.test(nextBody)) ||
        (!seenFirstArticle && /^Art\s*\.?\s*\d/i.test(nextBody)))
    ) {
      push({ kind: "rubrica", label: null, text: body, heading: null, notes, articleKey: null, anchor: uniqueAnchor(`rubrica-${ord}`), revoked: false, level: 0 });
      continue;
    }

    if (!seenFirstArticle) {
      // Preâmbulo (CF) e textos introdutórios; descarta cabeçalhos de navegação do Planalto
      if (body.length > 0 && !HEADER_JUNK.test(body)) push({ kind: "preambulo", label: null, text: body, heading: null, notes, articleKey: null, anchor: uniqueAnchor("preambulo"), revoked: false, level: 0 });
      continue;
    }

    const base = currentArticle ? `art${currentArticle.replace(/^adct-/, "adct")}`.toLowerCase() : "x";

    // Parágrafo
    const par = body.match(/^(§\s*\d+[º°o]?(?:-[A-Z]{1,3})?|Par[áa]grafo\s+[úu]nico)\s*[.\-–—:]?\s*/i);
    if (par) {
      const label = /^§/.test(par[1]) ? par[1].replace(/\s+/g, " ").replace(/§(\d)/, "§ $1").replace(/o$/, "º") : "Parágrafo único";
      const text = clean(body.slice(par[0].length));
      const pid = /^§/.test(par[1]) ? par[1].replace(/\D/g, "") : "u";
      lastParagraphAnchor = uniqueAnchor(`${base}-p${pid}`);
      lastIncisoAnchor = lastAlineaAnchor = null;
      push({ kind: "paragrafo", label, text, heading: null, notes, articleKey: currentArticle, anchor: lastParagraphAnchor, revoked: !text || isOnlyRevoked(notes, text), level: 1 });
      continue;
    }

    // Inciso
    const inc = body.match(new RegExp(`^(${ROMAN}(?:-[A-Z]{1,3})?)\\s*[-–—]\\s*`));
    if (inc) {
      const text = clean(body.slice(inc[0].length));
      lastIncisoAnchor = uniqueAnchor(`${lastParagraphAnchor ?? base}-${inc[1].toLowerCase()}`);
      lastAlineaAnchor = null;
      push({ kind: "inciso", label: inc[1], text, heading: null, notes, articleKey: currentArticle, anchor: lastIncisoAnchor, revoked: !text || isOnlyRevoked(notes, text), level: lastParagraphAnchor ? 2 : 1 });
      continue;
    }

    // Alínea
    const ali = body.match(/^([a-z](?:-[A-Z])?)\)\s*/);
    if (ali) {
      const text = clean(body.slice(ali[0].length));
      lastAlineaAnchor = uniqueAnchor(`${lastIncisoAnchor ?? lastParagraphAnchor ?? base}-${ali[1]}`);
      push({ kind: "alinea", label: `${ali[1]})`, text, heading: null, notes, articleKey: currentArticle, anchor: lastAlineaAnchor, revoked: !text || isOnlyRevoked(notes, text), level: (lastParagraphAnchor ? 2 : 1) + (lastIncisoAnchor ? 1 : 0) });
      continue;
    }

    // Item numérico
    const item = body.match(/^(\d{1,3})\.\s+/);
    if (item && lastAlineaAnchor) {
      const text = clean(body.slice(item[0].length));
      push({ kind: "item", label: `${item[1]}.`, text, heading: null, notes, articleKey: currentArticle, anchor: uniqueAnchor(`${lastAlineaAnchor}-${item[1]}`), revoked: !text || isOnlyRevoked(notes, text), level: 4 });
      continue;
    }

    // Pena (códigos penais)
    const pena = body.match(/^Pena\s*[-–—:]\s*/i);
    if (pena) {
      push({ kind: "pena", label: "Pena", text: clean(body.slice(pena[0].length)), heading: null, notes, articleKey: currentArticle, anchor: uniqueAnchor(`${base}-pena`), revoked: false, level: 1 });
      continue;
    }

    // Linhas apenas com anotações (ex.: "(Vide ADIN nº ...)") anexam ao nó anterior
    if (!body && notes.length && nodes.length) {
      nodes[nodes.length - 1].notes.push(...notes);
      continue;
    }
    if (!body) continue;

    // Caput na linha seguinte ao rótulo ("Artigo 1º" / texto)
    if (awaitCaput) {
      awaitCaput.text = body;
      awaitCaput.notes.push(...notes);
      awaitCaput = null;
      continue;
    }

    // Texto livre dentro do artigo (continuações, citações, anexos)
    push({ kind: "texto", label: null, text: body, heading: null, notes, articleKey: currentArticle, anchor: uniqueAnchor(`${base}-t`), revoked: false, level: 1 });
  }

  // Se o cabeçalho pendente não teve artigos, mantém mesmo assim (pode ser título revogado).
  void pendingHeading;

  // Remove rótulos duplicados de redação antiga ("Art. 401" revogado vazio + "Art. 401" vigente)
  const byKey = new Map<string, ParsedNode[]>();
  for (const n of nodes) if (n.kind === "artigo" && n.articleKey) byKey.set(n.articleKey, [...(byKey.get(n.articleKey) ?? []), n]);
  const drop = new Set<ParsedNode>();
  for (const list of byKey.values()) {
    if (list.length < 2 || !list.some((n) => !n.revoked)) continue;
    for (const n of list) if (n.revoked && !n.text) drop.add(n);
  }
  if (drop.size) {
    for (let i = nodes.length - 1; i >= 0; i--) if (drop.has(nodes[i])) nodes.splice(i, 1);
    const used = new Set(nodes.map((n) => n.anchor));
    for (const n of nodes) {
      const m = n.anchor.match(/^(.*)-(\d+)$/);
      if (n.kind === "artigo" && m && !used.has(m[1])) {
        used.delete(n.anchor);
        n.anchor = m[1];
        used.add(n.anchor);
      }
    }
    nodes.forEach((n, i) => (n.ord = i));
  }

  const contentHash = createHash("sha256")
    .update(nodes.map((n) => `${n.kind}|${n.label ?? ""}|${n.text}|${n.heading ?? ""}`).join("\n"))
    .digest("hex");

  return {
    epigrafe,
    ementa,
    nodes,
    contentHash,
    articleCount: nodes.filter((n) => n.kind === "artigo").length,
  };
}

function isOnlyRevoked(notes: string[], text: string) {
  return text.replace(/[.;,:\s]/g, "") === "" && notes.some((n) => /revogad|vetad/i.test(n));
}
