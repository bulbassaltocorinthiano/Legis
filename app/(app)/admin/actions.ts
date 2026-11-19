"use server";
import { revalidatePath } from "next/cache";
import { createUser, hashPassword, requireAdmin, requireUser, validatePassword } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { ingestNorm, type NormRow } from "@/lib/ingest/run";
import { slugifyTerm } from "@/lib/glossary/seed";
import bcrypt from "bcryptjs";

export type FormState = { ok?: string; error?: string };

export async function createUserAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    await createUser({
      username: String(form.get("username") ?? ""),
      name: String(form.get("name") ?? ""),
      password: String(form.get("password") ?? ""),
      role: form.get("role") === "admin" ? "admin" : "user",
    });
    revalidatePath("/admin/usuarios");
    return { ok: "Usuário criado." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(form.get("id"));
  const pw = String(form.get("password") ?? "");
  const err = validatePassword(pw);
  if (err) return { error: err };
  await q(`UPDATE users SET password_hash=$2 WHERE id=$1`, [id, await hashPassword(pw)]);
  await q(`DELETE FROM sessions WHERE user_id=$1`, [id]);
  return { ok: "Senha redefinida. As sessões abertas desse usuário foram encerradas." };
}

export async function toggleUserAction(form: FormData) {
  const me = await requireAdmin();
  const id = Number(form.get("id"));
  if (id === me.id) return;
  await q(`UPDATE users SET active = NOT active WHERE id=$1`, [id]);
  await q(`DELETE FROM sessions WHERE user_id=$1`, [id]);
  revalidatePath("/admin/usuarios");
}

export async function deleteUserAction(form: FormData) {
  const me = await requireAdmin();
  const id = Number(form.get("id"));
  if (id === me.id) return;
  await q(`DELETE FROM users WHERE id=$1`, [id]);
  revalidatePath("/admin/usuarios");
}

export async function changeOwnPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();
  const current = String(form.get("current") ?? "");
  const pw = String(form.get("password") ?? "");
  const row = await one<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id=$1`, [me.id]);
  if (!row || !(await bcrypt.compare(current, row.password_hash))) return { error: "Senha atual incorreta." };
  const err = validatePassword(pw);
  if (err) return { error: err };
  if (pw !== String(form.get("confirm") ?? "")) return { error: "A confirmação não confere." };
  await q(`UPDATE users SET password_hash=$2 WHERE id=$1`, [me.id, await hashPassword(pw)]);
  return { ok: "Senha alterada." };
}

export async function refreshNormAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const n = await one<NormRow>(`SELECT * FROM norms WHERE id=$1`, [id]);
  if (n) await ingestNorm(n, { force: true });
  revalidatePath("/admin/cobertura");
}

export async function setSourceUrlAction(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const url = String(form.get("url") ?? "").trim();
  if (!/^https:\/\/www\.planalto\.gov\.br\//.test(url)) return;
  await q(`UPDATE norms SET source_url=$2, source_etag=NULL, source_last_modified=NULL WHERE id=$1`, [id, url]);
  const n = await one<NormRow>(`SELECT * FROM norms WHERE id=$1`, [id]);
  if (n) await ingestNorm(n, { force: false });
  revalidatePath("/admin/cobertura");
}

export async function saveTermAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const term = String(form.get("term") ?? "").trim();
  const shortDef = String(form.get("short_definition") ?? "").trim();
  const def = String(form.get("definition") ?? "").trim();
  if (!term || !shortDef || !def) return { error: "Preencha termo, definição curta e explicação." };
  const original = String(form.get("original_slug") ?? "");
  const slug = original || slugifyTerm(term);
  const aliases = String(form.get("aliases") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  await q(
    `INSERT INTO glossary_terms(slug, term, aliases, area, short_definition, definition, legal_basis, example, updated_by, updated_at)
     VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9, now())
     ON CONFLICT (slug) DO UPDATE SET term=EXCLUDED.term, aliases=EXCLUDED.aliases, area=EXCLUDED.area,
       short_definition=EXCLUDED.short_definition, definition=EXCLUDED.definition, legal_basis=EXCLUDED.legal_basis,
       example=EXCLUDED.example, updated_by=EXCLUDED.updated_by, updated_at=now()`,
    [slug, term, JSON.stringify(aliases), String(form.get("area") ?? "Geral").trim() || "Geral", shortDef, def, String(form.get("legal_basis") ?? "").trim() || null, String(form.get("example") ?? "").trim() || null, me.name],
  );
  revalidatePath("/doutrina");
  return { ok: original ? "Verbete atualizado." : "Verbete criado." };
}

export async function deleteTermAction(form: FormData) {
  await requireAdmin();
  await q(`DELETE FROM glossary_terms WHERE slug=$1`, [String(form.get("slug"))]);
  revalidatePath("/doutrina");
  revalidatePath("/admin/doutrina");
}
