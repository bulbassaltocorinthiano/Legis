import "server-only";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { migrate } from "../scripts/migrate";
import { seedGlossary } from "./glossary/seed";

let ready: Promise<void> | null = null;

/**
 * Prepara o banco na primeira requisição: aplica migrações, sincroniza o catálogo,
 * carrega a biblioteca doutrinária inicial e cria o administrador inicial
 * (ADMIN_USERNAME / ADMIN_PASSWORD) se ainda não houver nenhum usuário.
 */
export function ensureReady() {
  if (!ready) {
    ready = (async () => {
      await migrate();
      await seedGlossary();
      const db = await getDb();
      const n = (await db.query<{ n: number }>(`SELECT count(*)::int n FROM users`))[0].n;
      if (n === 0 && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
        await db.query(`INSERT INTO users(username, name, password_hash, role) VALUES ($1,$2,$3,'admin')`, [
          process.env.ADMIN_USERNAME.toLowerCase(),
          process.env.ADMIN_NAME ?? "Administrador",
          await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
        ]);
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}
