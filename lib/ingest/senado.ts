// Metadados oficiais (ementa) via Dados Abertos do Senado Federal.
import { fetchRaw } from "./http";

const TIPO: Record<string, string> = { LEI: "LEI", LC: "LCP", DL: "DEL", DEC: "DEC", EC: "EMC", MP: "MPV", CF: "CON" };

export async function senadoEmenta(kind: string, number: string | null, year: number | null): Promise<string | null> {
  const tipo = TIPO[kind];
  if (!tipo || !year) return null;
  const num = (number ?? "").split("-")[0];
  const url = `https://legis.senado.leg.br/dadosabertos/legislacao/lista?tipo=${tipo}${num ? `&numero=${num}` : ""}&ano=${year}`;
  try {
    const r = await fetchRaw(url, { retries: 1, timeoutMs: 30_000 });
    if (r.status !== 200) return null;
    const xml = r.body.toString("utf8");
    const m = xml.match(/<ementa>([\s\S]*?)<\/ementa>/);
    return m ? decodeXml(m[1]).trim() : null;
  } catch {
    return null;
  }
}

function decodeXml(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
