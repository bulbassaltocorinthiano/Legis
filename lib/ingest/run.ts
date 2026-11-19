// Robô de ingestão/atualização: busca o texto no Planalto, detecta mudança e regrava os dispositivos.
import { getDb, type Db } from "../db";
import type { CatalogNorm } from "../catalog";
import { decodeHtml, fetchRaw } from "./http";
import { parsePlanaltoHtml, type ParsedNorm } from "./planalto-parser";
import { pageMatchesNorm, resolvePlanalto } from "./planalto-resolver";
import { senadoEmenta } from "./senado";

export const PLANALTO_KINDS = new Set(["CF", "LEI", "LC", "DL", "DEC", "EC", "MP"]);

export interface NormRow {
  id: number;
  key: string;
  slug: string;
  kind: string;
  number: string | null;
  year: number | null;
  description: string;
  ementa: string | null;
  source_url: string | null;
  source_etag: string | null;
  source_last_modified: string | null;
  content_hash: string | null;
  status: string;
}

export type IngestOutcome = "unchanged" | "changed" | "created" | "not_found" | "unsupported" | "error" | "not_modified";

function asCatalog(n: NormRow): CatalogNorm {
  return {
    key: n.key,
    slug: n.slug,
    kind: n.kind,
    number: n.number,
    year: n.year,
    nickname: null,
    description: n.description,
    note: null,
    sphere: "federal",
    categories: [],
  };
}

async function saveNodes(db: Db, normId: number, parsed: ParsedNorm) {
  await db.query(`DELETE FROM norm_nodes WHERE norm_id = $1`, [normId]);
  // inserção em lotes
  const BATCH = 300;
  for (let i = 0; i < parsed.nodes.length; i += BATCH) {
    const chunk = parsed.nodes.slice(i, i + BATCH);
    const values: unknown[] = [];
    const tuples = chunk.map((n, j) => {
      const b = j * 11;
      values.push(normId, n.ord, n.kind, n.label, n.text, n.heading, JSON.stringify(n.notes), n.articleKey, n.anchor, n.revoked, n.level);
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7}::jsonb,$${b + 8},$${b + 9},$${b + 10},$${b + 11})`;
    });
    await db.query(
      `INSERT INTO norm_nodes(norm_id, ord, kind, label, text, heading, notes, article_key, anchor, revoked, level) VALUES ${tuples.join(",")}`,
      values,
    );
  }
}

export async function ingestNorm(n: NormRow, opts: { force?: boolean; log?: (s: string) => void } = {}): Promise<IngestOutcome> {
  const log = opts.log ?? (() => {});
  const db = await getDb();
  if (!PLANALTO_KINDS.has(n.kind)) {
    await db.query(
      `UPDATE norms SET status='unsupported', status_detail=$2 WHERE id=$1`,
      [n.id, "Fonte oficial ainda não integrada (CNJ, CNMP, TSE, TCU, Senado-resoluções ou portais do Maranhão)."],
    );
    return "unsupported";
  }

  try {
    let html: string | null = null;
    let url = n.source_url;
    let etag: string | null = null;
    let lastModified: string | null = null;

    if (url) {
      const r = opts.force
        ? await fetchRaw(url)
        : await fetchRaw(url, { etag: n.source_etag, lastModified: n.source_last_modified });
      if (r.status === 304) {
        await db.query(`UPDATE norms SET checked_at=now() WHERE id=$1`, [n.id]);
        return "not_modified";
      }
      if (r.status === 200) {
        html = decodeHtml(r.body);
        if (!pageMatchesNorm(html, asCatalog(n))) html = null;
        etag = r.etag;
        lastModified = r.lastModified;
        url = r.url;
      }
    }
    if (!html) {
      const res = await resolvePlanalto(asCatalog(n));
      if (!res) {
        await db.query(`UPDATE norms SET status='not_found', status_detail=$2, checked_at=now() WHERE id=$1`, [
          n.id,
          "Endereço no Planalto não localizado automaticamente.",
        ]);
        log(`  ✗ ${n.key}: não localizado no Planalto`);
        return "not_found";
      }
      html = res.html;
      url = res.url;
      etag = res.etag;
      lastModified = res.lastModified;
    }

    let parsed = parsePlanaltoHtml(html, { isConstitution: n.kind === "CF" });
    // Norma inteiramente revogada: o Planalto tacha o texto todo. Mantemos o texto para consulta histórica.
    let historical = false;
    if (parsed.articleCount === 0) {
      const old = parsePlanaltoHtml(html, { isConstitution: n.kind === "CF", keepStruck: true });
      if (old.articleCount > 0) {
        parsed = old;
        historical = true;
      }
    }
    if (parsed.articleCount === 0) {
      await db.query(`UPDATE norms SET status='error', status_detail=$2, checked_at=now(), source_url=$3 WHERE id=$1`, [
        n.id,
        "Página encontrada, mas nenhum artigo foi reconhecido.",
        url,
      ]);
      return "error";
    }

    const ementa = n.ementa ?? (await senadoEmenta(n.kind, n.number, n.year));
    const changed = parsed.contentHash !== n.content_hash;

    await db.transaction(async (tx) => {
      if (changed) {
        await saveNodes(tx, n.id, parsed);
        if (n.content_hash) {
          await tx.query(`INSERT INTO norm_changes(norm_id, old_hash, new_hash, summary) VALUES ($1,$2,$3,$4)`, [
            n.id,
            n.content_hash,
            parsed.contentHash,
            "Texto atualizado na fonte oficial (Planalto).",
          ]);
        }
      }
      await tx.query(
        `UPDATE norms SET status='ok', status_detail=NULL, source='planalto', source_url=$2, source_etag=$3,
           source_last_modified=$4, content_hash=$5, article_count=$6, ementa=COALESCE($7, ementa),
           checked_at=now(), changed_at=CASE WHEN $8 THEN now() ELSE changed_at END, historical=$9
         WHERE id=$1`,
        [n.id, url, etag, lastModified, parsed.contentHash, parsed.articleCount, ementa, changed, historical],
      );
    });
    log(`  ✓ ${n.key}: ${parsed.articleCount} artigos ${changed ? (n.content_hash ? "(ATUALIZADO)" : "(novo)") : "(sem mudança)"}`);
    return changed ? (n.content_hash ? "changed" : "created") : "unchanged";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.query(`UPDATE norms SET status='error', status_detail=$2, checked_at=now() WHERE id=$1`, [n.id, msg.slice(0, 500)]);
    log(`  ✗ ${n.key}: ${msg}`);
    return "error";
  }
}

/** Processa as normas conferidas há mais tempo (usado pelo cron). */
export async function runUpdateBatch(
  opts: { limit?: number; keys?: string[]; force?: boolean; concurrency?: number; log?: (s: string) => void } = {},
) {
  const db = await getDb();
  const run = (await db.query<{ id: number }>(`INSERT INTO ingestion_runs(kind) VALUES ('legislacao') RETURNING id`))[0];
  const rows = opts.keys?.length
    ? await db.query<NormRow>(`SELECT * FROM norms WHERE key = ANY($1::text[]) ORDER BY id`, [opts.keys])
    : await db.query<NormRow>(
        `SELECT * FROM norms WHERE status <> 'unsupported' OR checked_at IS NULL
         ORDER BY checked_at NULLS FIRST, id LIMIT $1`,
        [opts.limit ?? 25],
      );
  const counts: Record<string, number> = {};
  // até 4 normas em paralelo (cada uma já espaça suas próprias requisições ao Planalto)
  const queue = [...rows];
  const worker = async () => {
    for (let n = queue.shift(); n; n = queue.shift()) {
      const out = await ingestNorm(n, { force: opts.force, log: opts.log });
      counts[out] = (counts[out] ?? 0) + 1;
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 4, rows.length || 1) }, worker));
  await db.query(
    `UPDATE ingestion_runs SET finished_at=now(), checked=$2, changed=$3, failed=$4, log=$5 WHERE id=$1`,
    [run.id, rows.length, (counts.changed ?? 0) + (counts.created ?? 0), (counts.error ?? 0) + (counts.not_found ?? 0), JSON.stringify(counts)],
  );
  return counts;
}
