import "server-only";
import { getDb, one, q } from "../db";
import { ensureReady } from "../bootstrap";
import { getNodes, type NodeRow } from "../data";
import { countWords, PACES, planTrail, streaks, TZ, type Pace, type PlanArticle, type Segment } from "./plan";

export { TZ };
const BLOCK_KINDS = new Set(["parte", "livro", "titulo", "subtitulo", "capitulo"]);
const STRUCT = new Set(["parte", "livro", "titulo", "subtitulo", "capitulo", "secao", "subsecao"]);

export interface Trail {
  id: number;
  title: string;
  minutes_per_day: number;
  words_per_minute: number;
  pace: Pace;
  review_every: number;
  status: "ativa" | "concluida";
  created_at: string;
  finished_at: string | null;
  total_days: number;
  done_days: number;
  total_words: number;
  done_words: number;
  next_day: number | null;
  norms: string; // apelidos/títulos separados por " · "
}

export interface TrailDay {
  id: number;
  day_no: number;
  kind: "leitura" | "revisao";
  segments: (Segment & { slug?: string; norm_title?: string })[];
  review_of: number[];
  words: number;
  articles: number;
  est_minutes: number;
  completed_at: string | null;
}

// ---------- normas disponíveis para montar trilhas ----------

export async function getPlannableNorms() {
  await ensureReady();
  return q<{ id: number; slug: string; title: string; nickname: string | null; description: string; article_count: number; words: number; area: string | null; area_id: number | null }>(
    `SELECT n.id, n.slug, n.title, n.nickname, n.description, n.article_count,
            coalesce((SELECT (sum(char_length(nn.text)) / 6.1)::int FROM norm_nodes nn WHERE nn.norm_id = n.id AND NOT nn.revoked), 0) AS words,
            (SELECT c.title FROM norm_categories nc JOIN categories c ON c.id = nc.category_id WHERE nc.norm_id = n.id ORDER BY c.id LIMIT 1) AS area,
            (SELECT min(nc.category_id) FROM norm_categories nc WHERE nc.norm_id = n.id) AS area_id
       FROM norms n
      WHERE n.status = 'ok' AND n.article_count > 0
      ORDER BY area_id NULLS LAST, CASE n.kind WHEN 'CF' THEN 0 WHEN 'EC' THEN 1 WHEN 'LC' THEN 2 WHEN 'LEI' THEN 3 WHEN 'DL' THEN 4 ELSE 5 END, n.year DESC NULLS LAST`,
  );
}

/** Agrupa os nós de uma norma em artigos com contagem de palavras. */
export function articlesFromNodes(nodes: NodeRow[]): PlanArticle[] {
  const out: PlanArticle[] = [];
  let cur: PlanArticle | null = null;
  let pendingBlock = false;
  for (const n of nodes) {
    if (BLOCK_KINDS.has(n.kind)) {
      pendingBlock = true;
      continue;
    }
    if (n.kind === "artigo" && n.article_key) {
      const base = n.label ?? `Art. ${n.article_key.replace(/^adct-/, "")}`;
      cur = { key: n.article_key, label: n.article_key.startsWith("adct-") ? `ADCT ${base.replace(/^Art\./, "art.")}` : base, ord: n.ord, endOrd: n.ord, words: 0, blockStart: pendingBlock && out.length > 0 };
      pendingBlock = false;
      out.push(cur);
    }
    if (cur && n.article_key === cur.key) {
      cur.endOrd = n.ord;
      if (!n.revoked) cur.words += countWords(n.label) + countWords(n.text) + countWords(n.heading);
    }
  }
  return out;
}

// ---------- criação ----------

export async function createTrail(userId: number, input: { title: string; minutes: number; pace: Pace; reviewEvery: number; normIds: number[] }) {
  await ensureReady();
  const wpm = PACES[input.pace]?.wpm ?? PACES.normal.wpm;
  const valid = await q<{ id: number }>(`SELECT id FROM norms WHERE id = ANY($1::int[]) AND status='ok'`, [input.normIds]);
  const okIds = new Set(valid.map((r) => r.id));
  const ids = input.normIds.filter((id) => okIds.has(id));
  if (!ids.length) throw new Error("Escolha ao menos uma norma com texto disponível.");

  const planNorms = [];
  for (const id of ids) planNorms.push({ normId: id, articles: articlesFromNodes(await getNodes(id)) });
  const days = planTrail(planNorms, input.minutes, wpm, input.reviewEvery);
  if (!days.length) throw new Error("Não há artigos vigentes para ler nas normas escolhidas.");

  const db = await getDb();
  return db.transaction(async (tx) => {
    const [t] = await tx.query<{ id: number }>(
      `INSERT INTO reading_trails(user_id, title, minutes_per_day, words_per_minute, pace, review_every) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [userId, input.title, input.minutes, wpm, input.pace, input.reviewEvery],
    );
    for (let i = 0; i < ids.length; i++) await tx.query(`INSERT INTO trail_norms(trail_id, norm_id, position) VALUES ($1,$2,$3)`, [t.id, ids[i], i]);
    const BATCH = 200;
    for (let i = 0; i < days.length; i += BATCH) {
      const chunk = days.slice(i, i + BATCH);
      const values: unknown[] = [];
      const tuples = chunk.map((d, j) => {
        const b = j * 8;
        values.push(t.id, i + j + 1, d.kind, JSON.stringify(d.segments), JSON.stringify(d.review_of ?? []), d.words, d.articles, d.est_minutes);
        return `($${b + 1},$${b + 2},$${b + 3},$${b + 4}::text::jsonb,$${b + 5}::text::jsonb,$${b + 6},$${b + 7},$${b + 8})`;
      });
      await tx.query(`INSERT INTO trail_days(trail_id, day_no, kind, segments, review_of, words, articles, est_minutes) VALUES ${tuples.join(",")}`, values);
    }
    return t.id;
  });
}

// ---------- leitura ----------

const TRAIL_SELECT = `
  SELECT t.id, t.title, t.minutes_per_day, t.words_per_minute, t.pace, t.review_every, t.status, t.created_at::text, t.finished_at::text,
         count(d.id)::int AS total_days,
         count(d.completed_at)::int AS done_days,
         coalesce(sum(d.words), 0)::int AS total_words,
         coalesce(sum(d.words) FILTER (WHERE d.completed_at IS NOT NULL), 0)::int AS done_words,
         min(d.day_no) FILTER (WHERE d.completed_at IS NULL) AS next_day,
         (SELECT string_agg(coalesce(n.nickname, n.title), ' · ' ORDER BY tn.position) FROM trail_norms tn JOIN norms n ON n.id = tn.norm_id WHERE tn.trail_id = t.id) AS norms
    FROM reading_trails t LEFT JOIN trail_days d ON d.trail_id = t.id`;

export async function getTrails(userId: number) {
  await ensureReady();
  return q<Trail>(`${TRAIL_SELECT} WHERE t.user_id = $1 GROUP BY t.id ORDER BY (t.status = 'ativa') DESC, t.created_at DESC`, [userId]);
}

export async function getTrail(userId: number, id: number) {
  await ensureReady();
  return one<Trail>(`${TRAIL_SELECT} WHERE t.user_id = $1 AND t.id = $2 GROUP BY t.id`, [userId, id]);
}

export async function getTrailDays(trailId: number) {
  const days = await q<TrailDay>(
    `SELECT id, day_no, kind, segments, review_of, words, articles, est_minutes, completed_at::text FROM trail_days WHERE trail_id = $1 ORDER BY day_no`,
    [trailId],
  );
  const norms = await q<{ id: number; slug: string; t: string }>(
    `SELECT n.id, n.slug, coalesce(n.nickname, n.title) t FROM trail_norms tn JOIN norms n ON n.id = tn.norm_id WHERE tn.trail_id = $1`,
    [trailId],
  );
  const by = new Map(norms.map((n) => [n.id, n]));
  for (const d of days) for (const s of d.segments) Object.assign(s, { slug: by.get(s.norm_id)?.slug, norm_title: by.get(s.norm_id)?.t });
  return days;
}

/** Localiza o trecho do segmento nos dispositivos atuais da norma (o robô pode ter regravado a lei). */
function sliceSegment(nodes: NodeRow[], s: Segment) {
  const pick = (key: string, ord: number, last: boolean) => {
    let best = -1;
    let dist = Infinity;
    nodes.forEach((n, i) => {
      if (n.article_key !== key) return;
      if (!last && n.kind !== "artigo") return;
      if (last && nodes[i + 1]?.article_key === key && nodes[i + 1]?.kind !== "artigo") return;
      const dd = Math.abs(n.ord - ord);
      if (dd < dist) {
        dist = dd;
        best = i;
      }
    });
    return best;
  };
  let a = pick(s.from_key, s.from_ord, false);
  let b = pick(s.to_key, s.to_ord, true);
  if (a < 0 || b < 0 || b < a) {
    a = nodes.findIndex((n) => n.ord >= s.from_ord);
    b = nodes.findLastIndex((n) => n.ord <= s.to_ord);
    if (a < 0 || b < a) return [];
  }
  // inclui títulos/capítulos logo antes do primeiro artigo (contexto da leitura)
  while (a > 0 && (STRUCT.has(nodes[a - 1].kind) || nodes[a - 1].kind === "rubrica")) a--;
  return nodes.slice(a, b + 1);
}

export async function getDayContent(day: TrailDay) {
  const cache = new Map<number, NodeRow[]>();
  const parts = [];
  for (const s of day.segments) {
    if (!cache.has(s.norm_id)) cache.set(s.norm_id, await getNodes(s.norm_id));
    parts.push({ segment: s, nodes: sliceSegment(cache.get(s.norm_id)!, s) });
  }
  return parts;
}

// ---------- conclusão e estatísticas ----------

export interface UserStats {
  words: number;
  articles: number;
  days: number;
  minutes: number;
  streak: number;
  bestStreak: number;
  readToday: boolean;
  trailsDone: number;
}

export async function getUserStats(userId: number): Promise<UserStats> {
  await ensureReady();
  const tot = await one<{ words: number; articles: number; days: number; minutes: number }>(
    `SELECT coalesce(sum(words),0)::int words, coalesce(sum(articles),0)::int articles, count(*)::int days, coalesce(sum(minutes),0)::int minutes
       FROM reading_log WHERE user_id = $1`,
    [userId],
  );
  const dates = await q<{ d: string }>(`SELECT DISTINCT to_char(read_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') d FROM reading_log WHERE user_id = $1`, [userId]);
  const done = await one<{ n: number }>(`SELECT count(*)::int n FROM reading_trails WHERE user_id = $1 AND status = 'concluida'`, [userId]);
  const s = streaks(dates.map((r) => r.d));
  return { words: tot?.words ?? 0, articles: tot?.articles ?? 0, days: tot?.days ?? 0, minutes: tot?.minutes ?? 0, streak: s.current, bestStreak: s.best, readToday: s.today, trailsDone: done?.n ?? 0 };
}

export interface Badge {
  id: string;
  title: string;
  desc: string;
  icon: string;
  got: (s: UserStats) => boolean;
}

export const BADGES: Badge[] = [
  { id: "primeiro-dia", title: "Primeiro passo", desc: "Concluiu o primeiro dia de leitura", icon: "👣", got: (s) => s.days >= 1 },
  { id: "seq-3", title: "Embalado", desc: "3 dias seguidos lendo", icon: "🔥", got: (s) => s.bestStreak >= 3 },
  { id: "seq-7", title: "Semana perfeita", desc: "7 dias seguidos lendo", icon: "📅", got: (s) => s.bestStreak >= 7 },
  { id: "seq-30", title: "Hábito formado", desc: "30 dias seguidos lendo", icon: "🏛️", got: (s) => s.bestStreak >= 30 },
  { id: "art-100", title: "Centena", desc: "100 artigos lidos", icon: "💯", got: (s) => s.articles >= 100 },
  { id: "art-500", title: "Leitor de fôlego", desc: "500 artigos lidos", icon: "📚", got: (s) => s.articles >= 500 },
  { id: "art-1000", title: "Mil artigos", desc: "1.000 artigos lidos", icon: "⚖️", got: (s) => s.articles >= 1000 },
  { id: "art-5000", title: "Lei seca na veia", desc: "5.000 artigos lidos", icon: "🏆", got: (s) => s.articles >= 5000 },
  { id: "trilha-1", title: "Trilha completa", desc: "Concluiu uma trilha inteira", icon: "🎓", got: (s) => s.trailsDone >= 1 },
];

export interface Celebration {
  dayNo: number;
  pct: number;
  doneDays: number;
  totalDays: number;
  trailDone: boolean;
  streak: number;
  articles: number;
  words: number;
  newBadges: { title: string; desc: string; icon: string }[];
  milestone: number | null; // 25 | 50 | 75 | 100
  nextDay: number | null;
}

export async function completeDay(userId: number, trailId: number, dayNo: number): Promise<Celebration | null> {
  const trail = await getTrail(userId, trailId);
  if (!trail) return null;
  const day = await one<{ id: number; words: number; articles: number; est_minutes: number; completed_at: string | null }>(
    `SELECT id, words, articles, est_minutes, completed_at::text FROM trail_days WHERE trail_id = $1 AND day_no = $2`,
    [trailId, dayNo],
  );
  if (!day) return null;
  const before = await getUserStats(userId);
  const pctBefore = trail.total_days ? (trail.done_days / trail.total_days) * 100 : 0;

  if (!day.completed_at) {
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.query(`UPDATE trail_days SET completed_at = now() WHERE id = $1 AND completed_at IS NULL`, [day.id]);
      await tx.query(
        `INSERT INTO reading_log(user_id, trail_day_id, words, articles, minutes) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (trail_day_id) WHERE trail_day_id IS NOT NULL DO NOTHING`,
        [userId, day.id, day.words, day.articles, day.est_minutes],
      );
      const left = await tx.query<{ n: number }>(`SELECT count(*)::int n FROM trail_days WHERE trail_id = $1 AND completed_at IS NULL`, [trailId]);
      if (left[0].n === 0) await tx.query(`UPDATE reading_trails SET status = 'concluida', finished_at = now() WHERE id = $1`, [trailId]);
    });
  }

  const after = await getUserStats(userId);
  const t2 = (await getTrail(userId, trailId))!;
  const pct = t2.total_days ? (t2.done_days / t2.total_days) * 100 : 0;
  const milestone = [100, 75, 50, 25].find((m) => pctBefore < m && pct >= m) ?? null;
  return {
    dayNo,
    pct: Math.round(pct),
    doneDays: t2.done_days,
    totalDays: t2.total_days,
    trailDone: t2.status === "concluida",
    streak: after.streak,
    articles: day.articles,
    words: day.words,
    newBadges: BADGES.filter((b) => b.got(after) && !b.got(before)).map(({ title, desc, icon }) => ({ title, desc, icon })),
    milestone,
    nextDay: t2.next_day,
  };
}

export async function uncompleteDay(userId: number, trailId: number, dayNo: number) {
  const trail = await getTrail(userId, trailId);
  if (!trail) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    const rows = await tx.query<{ id: number }>(`UPDATE trail_days SET completed_at = NULL WHERE trail_id = $1 AND day_no = $2 RETURNING id`, [trailId, dayNo]);
    if (rows[0]) await tx.query(`DELETE FROM reading_log WHERE trail_day_id = $1 AND user_id = $2`, [rows[0].id, userId]);
    await tx.query(`UPDATE reading_trails SET status = 'ativa', finished_at = NULL WHERE id = $1`, [trailId]);
  });
}

export async function deleteTrail(userId: number, trailId: number) {
  await q(`DELETE FROM reading_trails WHERE id = $1 AND user_id = $2`, [trailId, userId]);
}

// ---------- ranking (somente administrador) ----------

export interface RankRow {
  id: number;
  name: string;
  username: string;
  words: number;
  articles: number;
  days: number;
  minutes: number;
  last_read: string | null;
  active_trails: number;
  done_trails: number;
  streak: number;
}

export async function getRanking(sinceDays: number | null): Promise<RankRow[]> {
  await ensureReady();
  const cond = sinceDays ? `AND l.read_at >= now() - ($1::int * interval '1 day')` : `AND $1::int IS NULL`;
  const rows = await q<Omit<RankRow, "streak">>(
    `SELECT u.id, u.name, u.username,
            coalesce(sum(l.words),0)::int words, coalesce(sum(l.articles),0)::int articles, count(l.id)::int days,
            coalesce(sum(l.minutes),0)::int minutes, max(l.read_at)::text last_read,
            (SELECT count(*)::int FROM reading_trails t WHERE t.user_id = u.id AND t.status = 'ativa') active_trails,
            (SELECT count(*)::int FROM reading_trails t WHERE t.user_id = u.id AND t.status = 'concluida') done_trails
       FROM users u LEFT JOIN reading_log l ON l.user_id = u.id ${cond}
      WHERE u.active
      GROUP BY u.id
      ORDER BY words DESC, articles DESC, u.name`,
    [sinceDays],
  );
  const dates = await q<{ user_id: number; d: string }>(
    `SELECT DISTINCT user_id, to_char(read_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') d FROM reading_log WHERE read_at >= now() - interval '400 days'`,
  );
  const by = new Map<number, string[]>();
  for (const r of dates) by.set(r.user_id, [...(by.get(r.user_id) ?? []), r.d]);
  return rows.map((r) => ({ ...r, streak: streaks(by.get(r.id) ?? []).current }));
}
