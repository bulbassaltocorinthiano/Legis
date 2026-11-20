import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRanking } from "@/lib/trilhas";
import { relativeTime } from "@/lib/format";
import { AdminNav } from "../nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking de leitura" };

const PERIODS = [
  { k: "7", label: "7 dias", days: 7 },
  { k: "30", label: "30 dias", days: 30 },
  { k: "tudo", label: "Desde o início", days: null },
] as const;

const nf = new Intl.NumberFormat("pt-BR");
const MEDALS = ["🥇", "🥈", "🥉"];

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  await requireAdmin();
  const { periodo } = await searchParams;
  const period = PERIODS.find((p) => p.k === periodo) ?? PERIODS[1];
  const rows = await getRanking(period.days);
  const max = Math.max(1, ...rows.map((r) => r.words));
  const readers = rows.filter((r) => r.words > 0);

  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 sm:py-12">
      <AdminNav current="ranking" />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ranking de leitura</h1>
          <p className="text-ink-2 mt-1">Quem mais leu lei seca nas trilhas. Visível só para administradores: os usuários não veem a posição deles nem a dos outros.</p>
        </div>
        <nav className="flex gap-1 rounded-xl bg-surface-2 p-1 text-sm">
          {PERIODS.map((p) => (
            <Link key={p.k} href={`/admin/ranking?periodo=${p.k}`} className={`px-3 h-8 rounded-lg grid place-items-center ${p.k === period.k ? "bg-surface shadow-sm font-medium" : "text-ink-2 hover:text-ink"}`}>
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      {readers.length >= 1 && (
        <section className="mt-8 grid sm:grid-cols-3 gap-3">
          {readers.slice(0, 3).map((r, i) => (
            <div key={r.id} className={`rounded-3xl border p-5 ${i === 0 ? "bg-[var(--prazo-bg)]/60 border-[color-mix(in_srgb,var(--gold)_55%,transparent)]" : "bg-surface border-line"}`}>
              <p className="text-3xl">{MEDALS[i]}</p>
              <p className="mt-2 font-semibold">{r.name}</p>
              <p className="text-sm text-muted">@{r.username}</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{nf.format(r.articles)} <span className="text-sm font-normal text-muted">artigos</span></p>
              <p className="text-xs text-muted tabular-nums">
                {r.days} dias concluídos · {fmtMin(r.minutes)} · 🔥 {r.streak}
              </p>
            </div>
          ))}
        </section>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Palavras lidas</th>
              <th className="px-4 py-3 text-right">Artigos</th>
              <th className="px-4 py-3 text-right">Dias</th>
              <th className="px-4 py-3 text-right">Tempo</th>
              <th className="px-4 py-3 text-right">Sequência</th>
              <th className="px-4 py-3 text-right">Trilhas</th>
              <th className="px-4 py-3 text-right">Última leitura</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold tabular-nums">{r.words > 0 ? (MEDALS[i] ?? i + 1) : "–"}</td>
                <td className="px-4 py-3">
                  <span className="font-medium">{r.name}</span> <span className="text-muted">@{r.username}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-32 rounded-full bg-surface-2 overflow-hidden">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.words / max) * 100}%` }} />
                    </span>
                    <span className="tabular-nums">{nf.format(r.words)}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{nf.format(r.articles)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.days}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtMin(r.minutes)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.streak ? `🔥 ${r.streak}` : "–"}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {r.active_trails} ativa{r.active_trails === 1 ? "" : "s"}
                  {r.done_trails ? ` · ${r.done_trails} 🎓` : ""}
                </td>
                <td className="px-4 py-3 text-right text-muted">{r.last_read ? relativeTime(r.last_read) : "nunca"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        A pontuação é o total de palavras de lei dos dias concluídos no período (dias de revisão não somam palavras). O tempo é estimado pelo ritmo de cada trilha.
      </p>
    </main>
  );
}

function fmtMin(m: number) {
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
}
