"use server";
import { requireUser } from "@/lib/auth";
import { one, q } from "@/lib/db";
import type { Highlight, Note } from "@/lib/data";

const COLORS = new Set(["amarelo", "verde", "rosa", "azul"]);
const MAX_MARKS_PER_NORM = 3000;

export interface NewHighlight {
  anchor: string;
  start: number;
  end: number;
  color: string;
  quote: string;
}

const okAnchor = (a: unknown) => typeof a === "string" && /^[\w.-]{1,80}$/.test(a);

export async function addHighlights(normId: number, items: NewHighlight[]): Promise<Highlight[]> {
  const me = await requireUser();
  const valid = (Array.isArray(items) ? items : [])
    .filter(
      (h) =>
        okAnchor(h.anchor) &&
        Number.isInteger(h.start) &&
        Number.isInteger(h.end) &&
        h.start >= 0 &&
        h.end > h.start &&
        h.end - h.start <= 20000 &&
        COLORS.has(h.color) &&
        typeof h.quote === "string",
    )
    .slice(0, 50);
  if (!valid.length || !Number.isInteger(normId)) return [];
  const count = await one<{ n: number }>(`SELECT count(*)::int n FROM user_highlights WHERE user_id=$1 AND norm_id=$2`, [me.id, normId]);
  if ((count?.n ?? 0) >= MAX_MARKS_PER_NORM) throw new Error("Limite de marcações nesta norma atingido.");
  const out: Highlight[] = [];
  for (const h of valid) {
    const row = await one<Highlight>(
      `INSERT INTO user_highlights(user_id, norm_id, anchor, start_off, end_off, color, quote)
       SELECT $1, $2, $3, $4, $5, $6, $7 WHERE EXISTS (SELECT 1 FROM norms WHERE id=$2)
       RETURNING id::int, anchor, start_off, end_off, color, quote`,
      [me.id, normId, h.anchor, h.start, h.end, h.color, h.quote.slice(0, 20000)],
    );
    if (row) out.push(row);
  }
  return out;
}

export async function deleteHighlights(ids: number[]): Promise<number> {
  const me = await requireUser();
  const clean = (Array.isArray(ids) ? ids : []).filter((n) => Number.isInteger(n) && n > 0).slice(0, 500);
  if (!clean.length) return 0;
  const rows = await q(`DELETE FROM user_highlights WHERE user_id=$1 AND id = ANY($2::bigint[]) RETURNING id`, [me.id, clean]);
  return rows.length;
}

export async function saveNote(input: { id?: number; normId: number; anchor: string; quote?: string | null; body: string }): Promise<Note> {
  const me = await requireUser();
  const body = String(input.body ?? "").trim().slice(0, 10000);
  if (!body) throw new Error("A nota está vazia.");
  if (input.id) {
    const row = await one<Note>(
      `UPDATE user_notes SET body=$3, updated_at=now() WHERE id=$1 AND user_id=$2
       RETURNING id::int, anchor, quote, body, created_at::text, updated_at::text`,
      [input.id, me.id, body],
    );
    if (!row) throw new Error("Nota não encontrada.");
    return row;
  }
  if (!okAnchor(input.anchor) || !Number.isInteger(input.normId)) throw new Error("Dispositivo inválido.");
  const row = await one<Note>(
    `INSERT INTO user_notes(user_id, norm_id, anchor, quote, body) VALUES ($1,$2,$3,$4,$5)
     RETURNING id::int, anchor, quote, body, created_at::text, updated_at::text`,
    [me.id, input.normId, input.anchor, input.quote ? String(input.quote).slice(0, 1000) : null, body],
  );
  return row!;
}

export async function deleteNote(id: number): Promise<void> {
  const me = await requireUser();
  await q(`DELETE FROM user_notes WHERE id=$1 AND user_id=$2`, [id, me.id]);
}
