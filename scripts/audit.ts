// Auditoria: aponta normas com lacunas na numeração de artigos (possível falha de leitura).
import { q } from "../lib/db";
async function main() {
  const rows = await q<{ key: string; status: string; status_detail: string | null; article_count: number; keys: string[] | null }>(
    `SELECT n.key, n.status, n.status_detail, n.article_count,
            array_agg(nn.article_key) FILTER (WHERE nn.kind='artigo') keys
       FROM norms n LEFT JOIN norm_nodes nn ON nn.norm_id=n.id
      WHERE n.status IN ('ok','error') GROUP BY n.id ORDER BY n.key`);
  for (const r of rows) {
    if (r.status === "error") { console.log("ERRO", r.key, r.status_detail); continue; }
    const nums = new Set((r.keys ?? []).filter((k) => /^\d+$/.test(k)).map(Number));
    const max = Math.max(0, ...nums);
    const missing: number[] = [];
    for (let i = 1; i <= max; i++) if (!nums.has(i)) missing.push(i);
    const pct = max ? missing.length / max : 1;
    if (pct > 0.05 || max === 0) console.log(`${r.key}: ${r.article_count} art., máx ${max}, faltam ${missing.length} (${Math.round(pct * 100)}%) ${missing.slice(0, 15).join(",")}`);
  }
}
main().then(() => process.exit(0));
