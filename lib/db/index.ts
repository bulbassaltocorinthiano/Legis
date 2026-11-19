// Conexão com o Postgres.
// Produção (Vercel): DATABASE_URL apontando para um Postgres gerenciado (ex.: Neon).
// Desenvolvimento: sem DATABASE_URL, usa PGlite (Postgres embutido) em ./.data/pg.
import type { PGlite } from "@electric-sql/pglite";
import type postgres from "postgres";

type Row = Record<string, unknown>;

export interface Db {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
}

declare global {
  // eslint-disable-next-line no-var
  var __legisDb: Promise<Db> | undefined;
}

async function createPostgres(url: string): Promise<Db> {
  const { default: pg } = await import("postgres");
  const sql = pg(url, { max: 5, idle_timeout: 20, prepare: false });
  const wrap = (s: postgres.Sql | postgres.TransactionSql): Db => ({
    async query(q, params = []) {
      return (await s.unsafe(q, params as never[])) as never;
    },
    async exec(q) {
      await s.unsafe(q);
    },
    async transaction(fn) {
      if ("begin" in s) return (await (s as postgres.Sql).begin((tx) => fn(wrap(tx)))) as never;
      return fn(wrap(s));
    },
  });
  return wrap(sql);
}

async function createPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? "./.data/pg";
  const pg: PGlite = await PGlite.create(dir);
  const wrap = (s: Pick<PGlite, "query" | "exec">, isTx = false): Db => ({
    async query(q, params = []) {
      const r = await s.query(q, params as unknown[]);
      return r.rows as never;
    },
    async exec(q) {
      await s.exec(q);
    },
    async transaction(fn) {
      if (isTx) return fn(wrap(s, true));
      return pg.transaction((tx) => fn(wrap(tx as never, true)));
    },
  });
  return wrap(pg);
}

export function getDb(): Promise<Db> {
  if (!globalThis.__legisDb) {
    const url = process.env.DATABASE_URL;
    globalThis.__legisDb = url ? createPostgres(url) : createPglite();
  }
  return globalThis.__legisDb;
}

export async function q<T = Row>(sql: string, params: unknown[] = []) {
  const db = await getDb();
  return db.query<T>(sql, params);
}

export async function one<T = Row>(sql: string, params: unknown[] = []) {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}
