import "server-only";
import { one, q } from "../db";
import { ensureReady } from "../bootstrap";
import { streaks, TZ } from "../trilhas/plan";

const okAnchor = (a: unknown): a is string => typeof a === "string" && /^[\w.-]{1,80}$/.test(a);

/** Grava o que o leitor enviou: artigos vistos e segundos de leitura ativa. */
export async function recordReading(userId: number, normId: number, anchors: unknown[], seconds: number) {
  const list = [...new Set(anchors.filter(okAnchor))].slice(0, 200);
  const secs = Math.max(0, Math.min(600, Math.round(seconds)));
  if (!Number.isInteger(normId) || (!list.length && !secs)) return;
  if (list.length) {
    await q(
      `INSERT INTO article_reads(user_id, norm_id, article_key, anchor)
       SELECT DISTINCT ON (nn.article_key) $1, $2, nn.article_key, nn.anchor
         FROM norm_nodes nn
        WHERE nn.norm_id = $2 AND nn.kind = 'artigo' AND nn.article_key IS NOT NULL AND nn.anchor = ANY($3::text[])
       ON CONFLICT (user_id, norm_id, article_key)
       DO UPDATE SET views = article_reads.views + 1, last_at = now(), anchor = EXCLUDED.anchor`,
      [userId, normId, list],
    );
  }
  if (secs) {
    await q(
      `INSERT INTO reading_time(user_id, norm_id, day, hour, seconds)
       SELECT $1, n.id, (now() AT TIME ZONE '${TZ}')::date, extract(hour FROM now() AT TIME ZONE '${TZ}')::smallint, $3
         FROM norms n WHERE n.id = $2
       ON CONFLICT (user_id, norm_id, day, hour) DO UPDATE SET seconds = reading_time.seconds + EXCLUDED.seconds`,
      [userId, normId, secs],
    );
  }
}

export interface NormStat {
  id: number;
  slug: string;
  name: string;
  title: string;
  articles_total: number;
  articles_read: number;
  views: number;
  seconds: number;
  last_at: string | null;
  last_anchor: string | null;
  last_label: string | null;
}

export async function getReadingStats(userId: number) {
  await ensureReady();
  const totals = await one<{ seconds: number; days: number; articles: number; views: number; norms: number }>(
    `SELECT (SELECT coalesce(sum(seconds),0)::int FROM reading_time WHERE user_id = $1) seconds,
            (SELECT count(DISTINCT day)::int FROM reading_time WHERE user_id = $1 AND seconds > 0) days,
            (SELECT count(*)::int FROM article_reads WHERE user_id = $1) articles,
            (SELECT coalesce(sum(views),0)::int FROM article_reads WHERE user_id = $1) views,
            (SELECT count(DISTINCT norm_id)::int FROM (SELECT norm_id FROM article_reads WHERE user_id = $1 UNION SELECT norm_id FROM reading_time WHERE user_id = $1) x) norms`,
    [userId],
  );

  const daily = await q<{ day: string; seconds: number }>(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day, sum(seconds)::int seconds FROM reading_time
      WHERE user_id = $1 AND day > (now() AT TIME ZONE '${TZ}')::date - 30 GROUP BY day ORDER BY day`,
    [userId],
  );
  const hours = await q<{ hour: number; seconds: number }>(
    `SELECT hour::int, sum(seconds)::int seconds FROM reading_time WHERE user_id = $1 GROUP BY hour ORDER BY hour`,
    [userId],
  );
  const weekdays = await q<{ dow: number; seconds: number }>(
    `SELECT extract(dow FROM day)::int dow, sum(seconds)::int seconds FROM reading_time WHERE user_id = $1 GROUP BY 1 ORDER BY 1`,
    [userId],
  );
  const activeDays = await q<{ d: string }>(
    `SELECT DISTINCT to_char(day, 'YYYY-MM-DD') d FROM reading_time WHERE user_id = $1 AND seconds >= 30
     UNION SELECT DISTINCT to_char(read_at AT TIME ZONE '${TZ}', 'YYYY-MM-DD') FROM reading_log WHERE user_id = $1`,
    [userId],
  );

  const norms = await q<NormStat>(
    `WITH touched AS (
        SELECT norm_id FROM article_reads WHERE user_id = $1
        UNION SELECT norm_id FROM reading_time WHERE user_id = $1
     )
     SELECT n.id, n.slug, coalesce(n.nickname, n.description) AS name, n.title,
            (SELECT count(*)::int FROM norm_nodes nn WHERE nn.norm_id = n.id AND nn.kind = 'artigo' AND NOT nn.revoked) AS articles_total,
            (SELECT count(*)::int FROM article_reads ar WHERE ar.user_id = $1 AND ar.norm_id = n.id) AS articles_read,
            (SELECT coalesce(sum(views),0)::int FROM article_reads ar WHERE ar.user_id = $1 AND ar.norm_id = n.id) AS views,
            (SELECT coalesce(sum(seconds),0)::int FROM reading_time rt WHERE rt.user_id = $1 AND rt.norm_id = n.id) AS seconds,
            (SELECT max(last_at)::text FROM article_reads ar WHERE ar.user_id = $1 AND ar.norm_id = n.id) AS last_at,
            (SELECT ar.anchor FROM article_reads ar WHERE ar.user_id = $1 AND ar.norm_id = n.id ORDER BY ar.last_at DESC LIMIT 1) AS last_anchor,
            (SELECT nn.label FROM article_reads ar JOIN norm_nodes nn ON nn.norm_id = ar.norm_id AND nn.anchor = ar.anchor
              WHERE ar.user_id = $1 AND ar.norm_id = n.id ORDER BY ar.last_at DESC LIMIT 1) AS last_label
       FROM touched t JOIN norms n ON n.id = t.norm_id
      ORDER BY last_at DESC NULLS LAST, seconds DESC`,
    [userId],
  );

  const top = await q<{ slug: string; name: string; anchor: string; label: string | null; text: string | null; views: number; last_at: string }>(
    `SELECT n.slug, coalesce(n.nickname, n.description) AS name, ar.anchor, nn.label, left(nn.text, 180) AS text, ar.views, ar.last_at::text
       FROM article_reads ar JOIN norms n ON n.id = ar.norm_id
       LEFT JOIN norm_nodes nn ON nn.norm_id = ar.norm_id AND nn.anchor = ar.anchor
      WHERE ar.user_id = $1
      ORDER BY ar.views DESC, ar.last_at DESC LIMIT 10`,
    [userId],
  );

  const quiz = await one<{ attempts: number; score: number; total: number }>(
    `SELECT count(*)::int attempts, coalesce(sum(score),0)::int score, coalesce(sum(total),0)::int total FROM quiz_attempts WHERE user_id = $1`,
    [userId],
  );

  const s = streaks(activeDays.map((r) => r.d));
  return { totals: totals!, daily, hours, weekdays, norms, top, quiz: quiz!, streak: s.current, bestStreak: s.best };
}
