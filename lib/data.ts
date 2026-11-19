import "server-only";
import { one, q } from "./db";
import { ensureReady } from "./bootstrap";

export interface NormSummary {
  id: number;
  key: string;
  slug: string;
  kind: string;
  number: string | null;
  year: number | null;
  title: string;
  nickname: string | null;
  description: string;
  note: string | null;
  ementa: string | null;
  sphere: string;
  status: string;
  status_detail: string | null;
  article_count: number;
  source_url: string | null;
  checked_at: string | null;
  changed_at: string | null;
  historical: boolean;
}

export interface NodeRow {
  id: number;
  ord: number;
  kind: string;
  label: string | null;
  text: string;
  heading: string | null;
  notes: string[];
  article_key: string | null;
  anchor: string;
  revoked: boolean;
  level: number;
}

export interface Juris {
  id: number;
  court: string;
  kind: string;
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
  article_key: string;
  detail: string | null;
  method: string;
}

export interface Term {
  id: number;
  slug: string;
  term: string;
  aliases: string[];
  area: string;
  short_definition: string;
  definition: string;
  legal_basis: string | null;
  example: string | null;
  updated_at: string;
  updated_by: string | null;
}

export async function getCategories() {
  await ensureReady();
  return q<{ id: number; slug: string; title: string; sphere: string; total: number; ok: number }>(
    `SELECT c.*, count(nc.norm_id)::int AS total, count(*) FILTER (WHERE n.status='ok')::int AS ok
       FROM categories c LEFT JOIN norm_categories nc ON nc.category_id=c.id LEFT JOIN norms n ON n.id=nc.norm_id
      GROUP BY c.id ORDER BY c.id`,
  );
}

export async function getCategory(slug: string) {
  await ensureReady();
  return one<{ id: number; slug: string; title: string; sphere: string }>(`SELECT * FROM categories WHERE slug=$1`, [slug]);
}

export async function getNormsByCategory(categoryId: number) {
  return q<NormSummary>(
    `SELECT n.* FROM norms n JOIN norm_categories nc ON nc.norm_id=n.id WHERE nc.category_id=$1
      ORDER BY (n.status='ok') DESC, CASE n.kind WHEN 'CF' THEN 0 WHEN 'CE-MA' THEN 0 WHEN 'EC' THEN 1 WHEN 'LC' THEN 2 WHEN 'LC-MA' THEN 2 WHEN 'LEI' THEN 3 WHEN 'LEI-MA' THEN 3 WHEN 'DL' THEN 4 ELSE 5 END, n.year DESC NULLS LAST`,
    [categoryId],
  );
}

export async function getNorm(slug: string) {
  await ensureReady();
  return one<NormSummary>(`SELECT * FROM norms WHERE slug=$1`, [slug]);
}

export async function getNormCategories(normId: number) {
  return q<{ id: number; slug: string; title: string }>(
    `SELECT c.id, c.slug, c.title FROM categories c JOIN norm_categories nc ON nc.category_id=c.id WHERE nc.norm_id=$1 ORDER BY c.id`,
    [normId],
  );
}

export async function getNodes(normId: number) {
  return q<NodeRow>(
    `SELECT id, ord, kind, label, text, heading, notes, article_key, anchor, revoked, level FROM norm_nodes WHERE norm_id=$1 ORDER BY ord`,
    [normId],
  );
}

export async function getJurisCounts(normId: number) {
  const rows = await q<{ article_key: string; n: number }>(
    `SELECT article_key, count(*)::int n FROM jurisprudence_links WHERE norm_id=$1 GROUP BY article_key`,
    [normId],
  );
  return new Map(rows.map((r) => [r.article_key, r.n]));
}

export async function getJurisForNorm(normId: number) {
  const rows = await q<Juris>(
    `SELECT j.id, j.court, j.kind, j.title, j.summary, j.body, j.status, j.judged_at::text, j.published_at::text, j.rapporteur,
            j.organ, j.url, j.source, l.article_key, l.detail, l.method
       FROM jurisprudence_links l JOIN jurisprudence j ON j.id=l.jurisprudence_id
      WHERE l.norm_id=$1
      ORDER BY CASE j.kind WHEN 'sumula_vinculante' THEN 0 WHEN 'repercussao_geral' THEN 1 WHEN 'sumula' THEN 2 WHEN 'tema_repetitivo' THEN 3 ELSE 4 END,
               j.judged_at DESC NULLS LAST`,
    [normId],
  );
  const map = new Map<string, Juris[]>();
  for (const r of rows) {
    const list = map.get(r.article_key) ?? [];
    list.push(r);
    map.set(r.article_key, list);
  }
  return map;
}

export async function getTerms() {
  await ensureReady();
  return q<Term>(`SELECT * FROM glossary_terms ORDER BY term`);
}

export async function getTerm(slug: string) {
  await ensureReady();
  return one<Term>(`SELECT * FROM glossary_terms WHERE slug=$1`, [slug]);
}

export async function searchTerms(text: string, limit = 8) {
  await ensureReady();
  const t = text.trim();
  if (!t) return [];
  return q<Term>(
    `SELECT * FROM glossary_terms
      WHERE unaccent_ci(term) LIKE '%' || unaccent_ci($1) || '%'
         OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(aliases) a WHERE unaccent_ci(a) LIKE '%' || unaccent_ci($1) || '%')
         OR unaccent_ci(short_definition) LIKE '%' || unaccent_ci($1) || '%'
      ORDER BY (unaccent_ci(term) = unaccent_ci($1)) DESC, (unaccent_ci(term) LIKE unaccent_ci($1) || '%') DESC, length(term)
      LIMIT $2`,
    [t, limit],
  );
}

export interface SearchHit {
  slug: string;
  title: string;
  nickname: string | null;
  anchor: string;
  label: string | null;
  kind: string;
  art_label: string | null;
  snippet: string;
  rank: number;
}

export async function searchLegislation(text: string, limit = 40) {
  await ensureReady();
  const t = text.trim();
  if (!t) return { norms: [] as NormSummary[], hits: [] as SearchHit[] };
  const norms = await q<NormSummary>(
    `SELECT * FROM norms
      WHERE unaccent_ci(title || ' ' || coalesce(nickname,'') || ' ' || description || ' ' || coalesce(ementa,'') || ' ' || coalesce(number,''))
            LIKE '%' || unaccent_ci($1) || '%'
         OR replace(coalesce(number,''), '.', '') = replace($1, '.', '')
      ORDER BY (status='ok') DESC, year DESC NULLS LAST LIMIT 12`,
    [t],
  );
  const hits = await q<SearchHit>(
    `SELECT n.slug, n.title, n.nickname, nn.anchor, nn.label, nn.kind,
            (SELECT a.label FROM norm_nodes a WHERE a.norm_id=nn.norm_id AND a.article_key=nn.article_key AND a.kind='artigo' ORDER BY a.ord LIMIT 1) AS art_label,
            ts_headline('portuguese', coalesce(nn.heading,'') || ' ' || nn.text, websearch_to_tsquery('portuguese', $1),
                        'StartSel=<mark>,StopSel=</mark>,MaxWords=40,MinWords=18,ShortWord=2') AS snippet,
            ts_rank(nn.tsv, websearch_to_tsquery('portuguese', $1)) AS rank
       FROM norm_nodes nn JOIN norms n ON n.id = nn.norm_id
      WHERE nn.tsv @@ websearch_to_tsquery('portuguese', $1) AND NOT nn.revoked
      ORDER BY rank DESC, n.id, nn.ord LIMIT $2`,
    [t, limit],
  );
  return { norms, hits };
}

export async function getCoverage() {
  await ensureReady();
  const byStatus = await q<{ status: string; n: number }>(`SELECT status, count(*)::int n FROM norms GROUP BY status`);
  const norms = await q<NormSummary & { categories: string }>(
    `SELECT n.*, string_agg(nc.category_id::text, ',' ORDER BY nc.category_id) AS categories
       FROM norms n LEFT JOIN norm_categories nc ON nc.norm_id=n.id GROUP BY n.id ORDER BY n.status, n.sphere, n.kind, n.year`,
  );
  const runs = await q<{ id: number; started_at: string; finished_at: string | null; kind: string; checked: number; changed: number; failed: number; log: string | null }>(
    `SELECT id, started_at::text, finished_at::text, kind, checked, changed, failed, log FROM ingestion_runs ORDER BY id DESC LIMIT 10`,
  );
  const changes = await q<{ title: string; slug: string; detected_at: string; summary: string }>(
    `SELECT n.title, n.slug, c.detected_at::text, c.summary FROM norm_changes c JOIN norms n ON n.id=c.norm_id ORDER BY c.id DESC LIMIT 20`,
  );
  const juris = await one<{ total: number; links: number; temas: number; acordaos: number }>(
    `SELECT (SELECT count(*)::int FROM jurisprudence) total, (SELECT count(*)::int FROM jurisprudence_links) links,
            (SELECT count(*)::int FROM jurisprudence WHERE kind='tema_repetitivo') temas,
            (SELECT count(*)::int FROM jurisprudence WHERE kind='acordao') acordaos`,
  );
  return { byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])), norms, runs, changes, juris };
}

export async function getRecentlyChanged(limit = 6) {
  await ensureReady();
  return q<NormSummary>(`SELECT * FROM norms WHERE status='ok' AND changed_at IS NOT NULL ORDER BY changed_at DESC LIMIT $1`, [limit]);
}

export async function getFeatured() {
  await ensureReady();
  return q<NormSummary>(
    `SELECT * FROM norms WHERE key = ANY($1::text[]) ORDER BY array_position($1::text[], key)`,
    [["CF-1988", "LEI-10406-2002", "LEI-13105-2015", "DL-2848-1940", "DL-3689-1941", "LEI-5172-1966", "LEI-8078-1990", "DL-5452-1943"]],
  );
}

export async function getHomeStats() {
  await ensureReady();
  return one<{ normas: number; artigos: number; julgados: number; temas: number; conceitos: number; conferido: string | null }>(
    `SELECT (SELECT count(*)::int FROM norms WHERE status='ok') normas,
            (SELECT coalesce(sum(article_count),0)::int FROM norms WHERE status='ok') artigos,
            (SELECT count(*)::int FROM jurisprudence) julgados,
            (SELECT count(*)::int FROM jurisprudence WHERE kind='tema_repetitivo') temas,
            (SELECT count(*)::int FROM glossary_terms) conceitos,
            (SELECT max(checked_at)::text FROM norms) conferido`,
  );
}

// ---- Marcações e notas pessoais (sempre filtradas pelo usuário logado) ----
export interface Highlight {
  id: number;
  anchor: string;
  start_off: number;
  end_off: number;
  color: string;
  quote: string;
}
export interface Note {
  id: number;
  anchor: string;
  quote: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export async function getUserHighlights(userId: number, normId: number) {
  return q<Highlight>(
    `SELECT id::int, anchor, start_off, end_off, color, quote FROM user_highlights WHERE user_id=$1 AND norm_id=$2 ORDER BY id`,
    [userId, normId],
  );
}

export async function getUserNotes(userId: number, normId: number) {
  return q<Note>(
    `SELECT id::int, anchor, quote, body, created_at::text, updated_at::text FROM user_notes WHERE user_id=$1 AND norm_id=$2 ORDER BY created_at`,
    [userId, normId],
  );
}

export async function getAllUserNotes(userId: number) {
  await ensureReady();
  const notes = await q<Note & { slug: string; title: string; nickname: string | null; label: string | null }>(
    `SELECT un.id::int, un.anchor, un.quote, un.body, un.created_at::text, un.updated_at::text, n.slug, n.title, n.nickname,
            (SELECT nn.label FROM norm_nodes nn WHERE nn.norm_id=un.norm_id AND nn.anchor=un.anchor LIMIT 1) AS label
       FROM user_notes un JOIN norms n ON n.id=un.norm_id
      WHERE un.user_id=$1 ORDER BY un.updated_at DESC`,
    [userId],
  );
  const marks = await q<{ slug: string; title: string; nickname: string | null; n: number; last: string }>(
    `SELECT n.slug, n.title, n.nickname, count(*)::int n, max(h.created_at)::text last
       FROM user_highlights h JOIN norms n ON n.id=h.norm_id WHERE h.user_id=$1
      GROUP BY n.id ORDER BY max(h.created_at) DESC`,
    [userId],
  );
  return { notes, marks };
}
