// Uso:
//   npm run ingest -- --keys CF-1988,LEI-10406-2002     (normas específicas)
//   npm run ingest -- --all                              (todo o catálogo)
//   npm run ingest -- --limit 50                         (as 50 conferidas há mais tempo)
//   --force  ignora ETag/Last-Modified e reprocessa
import { migrate } from "./migrate";
import { runUpdateBatch } from "../lib/ingest/run";
import { q } from "../lib/db";

const args = process.argv.slice(2);
const get = (k: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  await migrate();
  const force = args.includes("--force");
  const keys = get("--keys")?.split(",").map((s) => s.trim());
  const limit = args.includes("--all") ? 10_000 : Number(get("--limit") ?? 25);
  const t0 = Date.now();
  const counts = await runUpdateBatch({ keys, limit, force, log: console.log });
  console.log("Resultado:", counts, `em ${Math.round((Date.now() - t0) / 1000)}s`);
  const cov = await q<{ status: string; n: number }>(`SELECT status, count(*)::int n FROM norms GROUP BY status ORDER BY status`);
  console.log("Cobertura:", Object.fromEntries(cov.map((r) => [r.status, r.n])));
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
