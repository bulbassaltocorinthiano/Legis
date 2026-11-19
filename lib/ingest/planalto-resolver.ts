// Descobre a URL oficial no Planalto (texto compilado, quando houver) para uma norma federal.
// As URLs do Planalto seguem padrões que mudaram ao longo dos anos; geramos candidatos e validamos
// o conteúdo (o número da norma precisa aparecer no cabeçalho da página).
import type { CatalogNorm } from "../catalog";
import { formatNumber } from "../catalog";
import { decodeHtml, fetchRaw } from "./http";

const BASE = "https://www.planalto.gov.br/ccivil_03";

function atoBracket(y: number) {
  if (y >= 2023) return "_ato2023-2026";
  if (y >= 2019) return "_ato2019-2022";
  if (y >= 2015) return "_ato2015-2018";
  if (y >= 2011) return "_ato2011-2014";
  if (y >= 2007) return "_ato2007-2010";
  if (y >= 2004) return "_ato2004-2006";
  return null;
}

function withVariants(paths: string[]) {
  const out: string[] = [];
  for (const p of paths) {
    const stem = p.replace(/\.htm$/, "");
    out.push(`${stem}compilado.htm`, `${stem}compilada.htm`, `${stem}cons.htm`, `${stem}consol.htm`, p);
  }
  return out;
}

export function candidateUrls(n: CatalogNorm): string[] {
  const N = n.number ?? "";
  const Y = n.year ?? 0;
  const ato = atoBracket(Y);
  const pad4 = N.padStart(4, "0");
  let paths: string[] = [];
  switch (n.kind) {
    case "CF":
      return [`${BASE}/constituicao/constituicao.htm`];
    case "EC":
      return [`${BASE}/constituicao/emendas/emc/emc${N}.htm`];
    case "MP":
      return [`${BASE}/mpv/antigas_2001/${N}.htm`, `${BASE}/mpv/${N}.htm`];
    case "LC":
      paths = [`${BASE}/leis/lcp/lcp${N}.htm`];
      break;
    case "DL":
      paths = [`${BASE}/decreto-lei/del${N}.htm`, `${BASE}/decreto-lei/del${pad4}.htm`, `${BASE}/decreto-lei/1937-1946/del${pad4}.htm`, `${BASE}/decreto-lei/1965-1988/del${pad4}.htm`, `${BASE}/decreto-lei/1937-1946/del${N}.htm`, `${BASE}/decreto-lei/1965-1988/del${N}.htm`];
      break;
    case "LEI":
      if (Y < 1889) paths = [`${BASE}/leis/lim/lim${N}.htm`, `${BASE}/leis/lim/lim${N}-1850.htm`, `${BASE}/leis/lim/lim${pad4}.htm`];
      else if (ato) paths = [`${BASE}/${ato}/${Y}/lei/l${N}.htm`];
      else if (Y === 2003 || Y === 2002 || Y === 2001)
        paths = [`${BASE}/leis/${Y}/l${N}.htm`, `${BASE}/leis/leis_${Y}/l${N}.htm`, `${BASE}/leis/l${N}.htm`];
      else
        paths = [
          `${BASE}/leis/l${N}.htm`,
          `${BASE}/leis/1980-1988/l${N}.htm`,
          `${BASE}/leis/1970-1979/l${N}.htm`,
          `${BASE}/leis/1950-1969/l${N}.htm`,
          `${BASE}/leis/1930-1949/l${N}.htm`,
          `${BASE}/leis/1989_1994/l${N}.htm`,
          `${BASE}/leis/l${pad4}.htm`,
        ];
      break;
    case "DEC": {
      if (ato) paths = [`${BASE}/${ato}/${Y}/decreto/d${N}.htm`];
      else if (Y === 2003 || Y === 2002 || Y === 2001) paths = [`${BASE}/decreto/${Y}/d${N}.htm`, `${BASE}/decreto/d${N}.htm`];
      else if (Y >= 1995) paths = [`${BASE}/decreto/d${N}.htm`, `${BASE}/decreto/${Y}/d${N}.htm`, `${BASE}/decreto/d${pad4}.htm`, `${BASE}/decreto/${Y}/d${pad4}.htm`];
      else if (Y >= 1990) paths = [`${BASE}/decreto/1990-1994/d${N}.htm`, `${BASE}/decreto/1990-1994/d${pad4}.htm`, `${BASE}/decreto/d${N}.htm`, `${BASE}/decreto/d${pad4}.htm`];
      else if (Y >= 1980) paths = [`${BASE}/decreto/1980-1989/d${N}.htm`, `${BASE}/decreto/d${N}.htm`, `${BASE}/decreto/1980-1989/1985-1987/d${N}.htm`];
      else if (Y >= 1970) paths = [`${BASE}/decreto/1970-1979/d${N}.htm`, `${BASE}/decreto/d${N}.htm`];
      else if (Y >= 1950) paths = [`${BASE}/decreto/1950-1969/d${N}.htm`, `${BASE}/decreto/antigos/d${N}.htm`];
      else paths = [`${BASE}/decreto/1930-1949/d${N}.htm`, `${BASE}/decreto/antigos/d${N}.htm`, `${BASE}/decreto/d${N}.htm`];
      break;
    }
    default:
      return [];
  }
  // Alguns anos (ex.: 2003–2004) usam o número com ponto no nome do arquivo: l10.833.htm
  if ((n.kind === "LEI" || n.kind === "DEC") && N.length >= 4) {
    const dotted = formatNumber(N);
    paths = [...paths, ...paths.map((p) => p.replace(new RegExp(`/(l|d)${N}\\.htm$`), `/$1${dotted}.htm`)).filter((p) => !paths.includes(p))];
  }
  return withVariants(paths);
}

/** O número da norma deve aparecer no começo da página (título/epígrafe). */
export function pageMatchesNorm(html: string, n: CatalogNorm) {
  if (n.kind === "CF") return /CONSTITUI[ÇC][ÃA]O/i.test(html.slice(0, 20000));
  const head = html.slice(0, 30000).replace(/<[^>]+>/g, " ").replace(/&nbsp;|\s+/g, " ");
  const num = n.number ?? "";
  const dotted = formatNumber(num);
  const re = new RegExp(`(?:n[º°o.]?\\s*|N[º°O]\\s*)?(?:${escape(dotted)}|${escape(num)})(?:[,\\s]|$)`, "i");
  if (!re.test(head)) return false;
  if (n.year && !head.includes(String(n.year)) && !head.includes(String(n.year).slice(2))) return false;
  return true;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface ResolveResult {
  url: string;
  html: string;
  lastModified: string | null;
  etag: string | null;
}

/** Procura a primeira URL candidata válida. Depois, se a página apontar um "texto compilado", segue o link. */
export async function resolvePlanalto(n: CatalogNorm, delayMs = 400): Promise<ResolveResult | null> {
  for (const url of candidateUrls(n)) {
    const r = await fetchRaw(url, { retries: 1, timeoutMs: 45_000 }).catch(() => null);
    await new Promise((res) => setTimeout(res, delayMs));
    if (!r || r.status !== 200 || r.body.length < 1500) continue;
    const html = decodeHtml(r.body);
    if (!pageMatchesNorm(html, n)) continue;
    // link para texto compilado?
    const comp = findCompiledLink(html, r.url);
    if (comp && comp !== r.url) {
      const c = await fetchRaw(comp, { retries: 1 }).catch(() => null);
      if (c && c.status === 200 && c.body.length > 1500) {
        const chtml = decodeHtml(c.body);
        if (pageMatchesNorm(chtml, n)) return { url: c.url, html: chtml, lastModified: c.lastModified, etag: c.etag };
      }
    }
    return { url: r.url, html, lastModified: r.lastModified, etag: r.etag };
  }
  return null;
}

export function findCompiledLink(html: string, baseUrl: string): string | null {
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (/^texto\s+compilad[oa]$/i.test(text)) {
      try {
        const u = new URL(m[1], baseUrl);
        u.hash = "";
        if (u.hostname.endsWith("planalto.gov.br")) {
          u.protocol = "https:";
          return u.toString();
        }
      } catch {
        /* ignora */
      }
    }
  }
  return null;
}
