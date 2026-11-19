import { getDb } from "../db";
import { GLOSSARY } from "./data";

export function slugifyTerm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Insere os verbetes iniciais que ainda não existem (não sobrescreve edições feitas no site). */
export async function seedGlossary() {
  const db = await getDb();
  for (const [term, aliases, area, short, definition, basis] of GLOSSARY) {
    await db.query(
      `INSERT INTO glossary_terms(slug, term, aliases, area, short_definition, definition, legal_basis, updated_by)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,'base inicial') ON CONFLICT (slug) DO NOTHING`,
      [slugifyTerm(term), term, JSON.stringify(aliases), area, short, definition, basis || null],
    );
  }
}
