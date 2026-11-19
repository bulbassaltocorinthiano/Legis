import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "../lib/db";
import { createHash } from "node:crypto";
import { loadCatalog, formalTitle } from "../lib/catalog";
import { CATALOG_TEXT } from "../lib/catalog/data";

export async function migrate() {
  const db = await getDb();
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await db.query<{ name: string }>(`SELECT name FROM schema_migrations`)).map((r) => r.name));
  const dir = join(process.cwd(), "db/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(f)) continue;
    console.log(`→ aplicando ${f}`);
    await db.exec(readFileSync(join(dir, f), "utf8"));
    await db.query(`INSERT INTO schema_migrations(name) VALUES ($1)`, [f]);
  }
  await syncCatalog();
}

/** Garante que todas as normas do catálogo existam no banco (sem apagar o texto já ingerido). */
export async function syncCatalog() {
  const db = await getDb();
  const { categories, norms } = loadCatalog();
  // pula se o catálogo não mudou desde a última sincronização (evita centenas de queries a cada cold start)
  const marker = "catalog:" + createHash("sha1").update(CATALOG_TEXT).digest("hex").slice(0, 16);
  if ((await db.query(`SELECT 1 FROM schema_migrations WHERE name=$1`, [marker])).length) return;
  for (const c of categories) {
    await db.query(
      `INSERT INTO categories(id, slug, title, sphere) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug, title=EXCLUDED.title, sphere=EXCLUDED.sphere`,
      [c.id, c.slug, c.title, c.sphere],
    );
  }
  for (const n of norms) {
    const rows = await db.query<{ id: number }>(
      `INSERT INTO norms(key, slug, kind, number, year, title, nickname, description, note, sphere)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (key) DO UPDATE SET title=EXCLUDED.title, nickname=EXCLUDED.nickname,
         description=EXCLUDED.description, note=EXCLUDED.note, sphere=EXCLUDED.sphere
       RETURNING id`,
      [n.key, n.slug, n.kind, n.number, n.year, formalTitle(n), n.nickname, n.description, n.note, n.sphere],
    );
    const id = rows[0].id;
    for (const c of n.categories) {
      await db.query(`INSERT INTO norm_categories(norm_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, c]);
    }
  }
  await db.query(`DELETE FROM schema_migrations WHERE name LIKE 'catalog:%'`);
  await db.query(`INSERT INTO schema_migrations(name) VALUES ($1)`, [marker]);
  console.log(`✓ catálogo sincronizado: ${norms.length} normas em ${categories.length} áreas`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
}
