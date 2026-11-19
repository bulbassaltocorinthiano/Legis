import iconv from "iconv-lite";

// O Planalto recusa conexões sem User-Agent de navegador.
export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export interface FetchResult {
  status: number;
  url: string;
  body: Buffer;
  lastModified: string | null;
  etag: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchRaw(
  url: string,
  opts: { etag?: string | null; lastModified?: string | null; timeoutMs?: number; retries?: number } = {},
): Promise<FetchResult> {
  const retries = opts.retries ?? 2;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
      };
      if (opts.etag) headers["If-None-Match"] = opts.etag;
      if (opts.lastModified) headers["If-Modified-Since"] = opts.lastModified;
      const res = await fetch(url, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
      });
      const body = Buffer.from(await res.arrayBuffer());
      return {
        status: res.status,
        url: res.url || url,
        body,
        lastModified: res.headers.get("last-modified"),
        etag: res.headers.get("etag"),
      };
    } catch (e) {
      lastErr = e;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw lastErr;
}

/** Decodifica HTML respeitando o charset declarado (Planalto usa majoritariamente windows-1252). */
export function decodeHtml(buf: Buffer): string {
  // BOM tem prioridade (algumas páginas do Planalto são UTF-16)
  if (buf[0] === 0xff && buf[1] === 0xfe) return iconv.decode(buf.subarray(2), "utf-16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) return iconv.decode(buf.subarray(2), "utf-16be");
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString("utf8");
  const head = buf.subarray(0, 4096).toString("latin1");
  const m = head.match(/charset\s*=\s*["']?([\w-]+)/i);
  let charset = (m?.[1] ?? "").toLowerCase();
  if (!charset) {
    // heurística: se for UTF-8 válido, usa UTF-8
    const asUtf8 = buf.toString("utf8");
    charset = asUtf8.includes("�") ? "windows-1252" : "utf-8";
  }
  if (charset === "iso-8859-1" || charset === "latin1") charset = "windows-1252";
  if (!iconv.encodingExists(charset)) charset = "windows-1252";
  return iconv.decode(buf, charset);
}
