// Jurisprudência do STJ a partir do Portal de Dados Abertos (CKAN): https://dadosabertos.web.stj.jus.br
//  - precedentes-qualificados/Temas.csv: temas repetitivos, IAC, PUIL etc. (tese firmada)
//  - espelhos-de-acordaos-<órgão>: acórdãos mensais com "referenciasLegislativas" estruturadas
import { parse as parseCsv } from "./csv";
import { getDb, type Db } from "../db";
import { fetchRaw } from "./http";
import { extractCitations, parseStjReference, type Citation } from "./citations";

const CKAN = "https://dadosabertos.web.stj.jus.br/api/3/action";

export const STJ_ORGAOS = [
  "corte-especial",
  "primeira-secao",
  "segunda-secao",
  "terceira-secao",
  "primeira-turma",
  "segunda-turma",
  "terceira-turma",
  "quarta-turma",
  "quinta-turma",
  "sexta-turma",
];

interface CkanResource {
  name: string;
  url: string;
  format: string;
  last_modified?: string;
  created?: string;
}

async function ckanResources(pkg: string): Promise<CkanResource[]> {
  const r = await fetchRaw(`${CKAN}/package_show?id=${pkg}`, { timeoutMs: 60_000 });
  const j = JSON.parse(r.body.toString("utf8"));
  return j.result.resources as CkanResource[];
}

async function normIdMap(db: Db) {
  const rows = await db.query<{ id: number; key: string }>(`SELECT id, key FROM norms`);
  return new Map(rows.map((r) => [r.key, r.id]));
}

async function upsertJuris(
  db: Db,
  j: {
    court: string;
    kind: string;
    external_id: string;
    title: string;
    summary: string | null;
    body: string | null;
    status: string | null;
    judged_at: string | null;
    published_at: string | null;
    rapporteur: string | null;
    organ: string | null;
    url: string | null;
    source: string;
  },
) {
  const rows = await db.query<{ id: number }>(
    `INSERT INTO jurisprudence(court, kind, external_id, title, summary, body, status, judged_at, published_at, rapporteur, organ, url, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (court, kind, external_id) DO UPDATE SET title=EXCLUDED.title, summary=EXCLUDED.summary, body=EXCLUDED.body,
       status=EXCLUDED.status, judged_at=EXCLUDED.judged_at, published_at=EXCLUDED.published_at, rapporteur=EXCLUDED.rapporteur,
       organ=EXCLUDED.organ, url=EXCLUDED.url
     RETURNING id`,
    [j.court, j.kind, j.external_id, j.title, j.summary, j.body, j.status, j.judged_at, j.published_at, j.rapporteur, j.organ, j.url, j.source],
  );
  return rows[0].id;
}

async function link(db: Db, jid: number, normIds: Map<string, number>, cites: Citation[], method: string) {
  let n = 0;
  for (const c of cites) {
    const nid = normIds.get(c.normKey);
    if (!nid) continue;
    await db.query(
      `INSERT INTO jurisprudence_links(jurisprudence_id, norm_id, article_key, detail, method) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (jurisprudence_id, norm_id, article_key) DO UPDATE SET detail=COALESCE(EXCLUDED.detail, jurisprudence_links.detail)`,
      [jid, nid, c.articleKey, c.detail, method],
    );
    n++;
  }
  return n;
}

const isoDate = (s: string | undefined | null) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);

/** Temas repetitivos e demais precedentes qualificados do STJ. */
export async function ingestStjTemas(log: (s: string) => void = console.log) {
  const db = await getDb();
  const normIds = await normIdMap(db);
  const res = (await ckanResources("precedentes-qualificados")).filter((r) => /^temas\.csv$/i.test(r.name));
  const latest = res[res.length - 1];
  const r = await fetchRaw(latest.url, { timeoutMs: 120_000 });
  const rows = parseCsv(r.body.toString("utf8"));
  let linked = 0;
  let count = 0;
  for (const row of rows) {
    const tipo = (row.tipoPrecedente || "").trim();
    const numero = (row.numeroPrecedente || "").trim();
    if (!numero) continue;
    const kindLabel = tipo === "Tema" || !tipo ? "Tema Repetitivo" : tipo === "Controvérsi" ? "Controvérsia" : tipo;
    if (kindLabel === "Controvérsia") continue; // controvérsias ainda não afetadas: pouco úteis para leitura
    const tese = (row.teseFirmada || "").trim();
    const questao = (row.questaoSubmetidaAJulgamento || "").trim();
    const situacao = (row.situacao || "").trim();
    const url =
      kindLabel === "Tema Repetitivo"
        ? `https://processo.stj.jus.br/repetitivos/temas_repetitivos/pesquisa.jsp?novaConsulta=true&tipo_pesquisa=T&cod_tema_inicial=${numero}&cod_tema_final=${numero}`
        : "https://processo.stj.jus.br/repetitivos/temas_repetitivos/";
    const jid = await upsertJuris(db, {
      court: "STJ",
      kind: kindLabel === "Tema Repetitivo" ? "tema_repetitivo" : kindLabel.toLowerCase(),
      external_id: `${kindLabel}-${numero}-${row.sequencialPrecedente}`,
      title: `${kindLabel} ${numero}`,
      summary: tese || null,
      body: questao || null,
      status: situacao || null,
      judged_at: isoDate(row.dataJulgamento),
      published_at: isoDate(row.dataPublicacaoAcordao),
      rapporteur: null,
      organ: (row.orgaoJulgador || "").trim() || null,
      url,
      source: "STJ Dados Abertos — Precedentes qualificados",
    });
    const cites = [
      ...extractCitations(`${row.referenciaLegislativa ?? ""} ${questao} ${tese}`),
    ];
    // "Lei 9.494/1997. Art. 1º-F. ..." (formato livre da coluna referenciaLegislativa)
    const ref = (row.referenciaLegislativa || "").match(/^(Lei(?: Complementar)?|Decreto-Lei)\s+([\d.]+)\/(\d{4})\.\s*Art\.\s*([\d.]+[º°o]?(?:-[A-Z])?)/i);
    if (ref) {
      const kind = /complementar/i.test(ref[1]) ? "LC" : /decreto/i.test(ref[1]) ? "DL" : "LEI";
      cites.push({ normKey: `${kind}-${ref[2].replace(/\./g, "")}-${ref[3]}`, articleKey: ref[4].replace(/[º°o.]/g, "").toUpperCase(), detail: null });
    }
    linked += await link(db, jid, normIds, cites, "texto");
    count++;
  }
  log(`STJ temas: ${count} precedentes, ${linked} vínculos com artigos`);
  return { count, linked };
}

function parseStjDate(s: string | null | undefined) {
  if (!s) return null;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const m2 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  return m2 ? `${m2[1]}-${m2[2]}-${m2[3]}` : null;
}

function formatProcess(sigla: string, num: string) {
  return `${sigla} ${num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** Acórdãos (espelhos) dos órgãos julgadores do STJ, últimos N meses. Só guarda os que citam normas do catálogo. */
export async function ingestStjEspelhos(months = 6, log: (s: string) => void = console.log, orgaos = STJ_ORGAOS) {
  const db = await getDb();
  const normIds = await normIdMap(db);
  let saved = 0;
  let links = 0;
  for (const org of orgaos) {
    let resources: CkanResource[];
    try {
      resources = (await ckanResources(`espelhos-de-acordaos-${org}`)).filter((r) => /^\d{8}\.json$/.test(r.name));
    } catch (e) {
      log(`  ✗ ${org}: ${(e as Error).message}`);
      continue;
    }
    resources.sort((a, b) => a.name.localeCompare(b.name));
    for (const res of resources.slice(-months)) {
      let data: Record<string, unknown>[];
      try {
        const r = await fetchRaw(res.url, { timeoutMs: 180_000 });
        data = JSON.parse(r.body.toString("utf8"));
      } catch (e) {
        log(`  ✗ ${org}/${res.name}: ${(e as Error).message}`);
        continue;
      }
      let fileSaved = 0;
      for (const a of data) {
        const refs = (a.referenciasLegislativas as string[] | null) ?? [];
        const cites = refs.flatMap((r) => parseStjReference(r)).filter((c) => normIds.has(c.normKey));
        if (!cites.length) continue;
        const sigla = String(a.siglaClasse ?? "");
        const numero = String(a.numeroProcesso ?? "");
        const registro = String(a.numeroRegistro ?? "");
        const jid = await upsertJuris(db, {
          court: "STJ",
          kind: "acordao",
          external_id: String(a.id),
          title: formatProcess(sigla, numero),
          summary: String(a.ementa ?? "").trim() || null,
          body: a.teseJuridica && a.teseJuridica !== "None" ? String(a.teseJuridica) : null,
          status: null,
          judged_at: parseStjDate(String(a.dataDecisao ?? "")),
          published_at: parseStjDate(String(a.dataPublicacao ?? "")),
          rapporteur: a.ministroRelator ? `Min. ${String(a.ministroRelator)}` : null,
          organ: String(a.nomeOrgaoJulgador ?? "") || null,
          url: registro ? `https://processo.stj.jus.br/processo/pesquisa/?num_registro=${registro}` : null,
          source: "STJ Dados Abertos — Espelhos de acórdãos",
        });
        links += await link(db, jid, normIds, cites, "referencia_oficial");
        saved++;
        fileSaved++;
      }
      log(`  ✓ ${org}/${res.name}: ${fileSaved} acórdãos vinculados`);
    }
  }
  log(`STJ acórdãos: ${saved} acórdãos, ${links} vínculos`);
  return { saved, links };
}
