"use server";
import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth";

// Limitação simples de tentativas por login (memória do processo).
const attempts = new Map<string, { n: number; until: number }>();

export async function loginAction(_: { error: string | null }, form: FormData) {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  const key = username.toLowerCase();
  const a = attempts.get(key);
  if (a && a.until > Date.now()) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  const user = await login(username, password);
  if (!user) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(key, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    return { error: "Login ou senha incorretos." };
  }
  attempts.delete(key);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
