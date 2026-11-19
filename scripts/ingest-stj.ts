// Uso: npm run ingest:stj -- [--months 6] [--only temas|acordaos]
import { migrate } from "./migrate";
import { ingestStjEspelhos, ingestStjTemas } from "../lib/ingest/stj";

const args = process.argv.slice(2);
const months = Number(args[args.indexOf("--months") + 1] || 6) || 6;
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

async function main() {
  await migrate();
  if (!only || only === "temas") await ingestStjTemas();
  if (!only || only === "acordaos") await ingestStjEspelhos(months);
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
