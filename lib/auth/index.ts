import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, q } from "../db";
import { ensureReady } from "../bootstrap";

export const SESSION_COOKIE = "legis_session";
export const MAX_USERS = 20;
const SESSION_DAYS = 30;

export interface User {
  id: number;
  username: string;
  name: string;
  role: "admin" | "user";
  active: boolean;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Use letras e números na senha.";
  return null;
}

export async function login(username: string, password: string): Promise<User | null> {
  await ensureReady();
  const u = await one<User & { password_hash: string }>(
    `SELECT id, username, name, role, active, password_hash FROM users WHERE lower(username) = lower($1)`,
    [username.trim()],
  );
  // compara mesmo quando o usuário não existe, para não revelar quais logins existem
  const ok = await bcrypt.compare(password, u?.password_hash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!u || !ok || !u.active) return null;
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await q(`INSERT INTO sessions(id, user_id, expires_at) VALUES ($1,$2,$3)`, [sha256(token), u.id, expires.toISOString()]);
  await q(`UPDATE users SET last_login_at = now() WHERE id = $1`, [u.id]);
  await q(`DELETE FROM sessions WHERE expires_at < now()`);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
  return { id: u.id, username: u.username, name: u.name, role: u.role, active: u.active };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await q(`DELETE FROM sessions WHERE id = $1`, [sha256(token)]);
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensureReady();
  return one<User>(
    `SELECT u.id, u.username, u.name, u.role, u.active
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now() AND u.active`,
    [sha256(token)],
  );
}

export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/");
  return u;
}

export async function countUsers() {
  const r = await one<{ n: number }>(`SELECT count(*)::int AS n FROM users`);
  return r?.n ?? 0;
}

export async function createUser(input: { username: string; name: string; password: string; role: "admin" | "user" }) {
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error("Login inválido: use 3 a 32 letras, números, ponto, hífen ou sublinhado.");
  const pwErr = validatePassword(input.password);
  if (pwErr) throw new Error(pwErr);
  if ((await countUsers()) >= MAX_USERS) throw new Error(`Limite de ${MAX_USERS} usuários atingido.`);
  const exists = await one(`SELECT 1 FROM users WHERE lower(username) = $1`, [username]);
  if (exists) throw new Error("Já existe um usuário com esse login.");
  await q(`INSERT INTO users(username, name, password_hash, role) VALUES ($1,$2,$3,$4)`, [
    username,
    input.name.trim() || username,
    await hashPassword(input.password),
    input.role,
  ]);
}
