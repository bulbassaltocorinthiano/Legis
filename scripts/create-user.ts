// Uso: npm run user:create -- <login> <senha> "<Nome>" [admin|user]
import { migrate } from "./migrate";
import { getDb } from "../lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const [username, password, name, role = "admin"] = process.argv.slice(2);
  if (!username || !password) throw new Error('Uso: npm run user:create -- <login> <senha> "<Nome>" [admin|user]');
  await migrate();
  const db = await getDb();
  const n = (await db.query<{ n: number }>(`SELECT count(*)::int n FROM users`))[0].n;
  if (n >= 20) throw new Error("Limite de 20 usuários atingido.");
  await db.query(
    `INSERT INTO users(username, name, password_hash, role) VALUES ($1,$2,$3,$4)
     ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash, role=EXCLUDED.role, active=true`,
    [username.toLowerCase(), name ?? username, await bcrypt.hash(password, 12), role === "user" ? "user" : "admin"],
  );
  console.log(`✓ usuário ${username} (${role}) pronto`);
}
main().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
