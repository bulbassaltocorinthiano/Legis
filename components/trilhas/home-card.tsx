import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getTrails, getUserStats } from "@/lib/trilhas";
import { Bar } from "./celebration";

/** Cartão da tela inicial: trilha ativa e atalho para a leitura do dia. */
export async function TrailHomeCard() {
  const me = await requireUser();
  const [trails, stats] = await Promise.all([getTrails(me.id), getUserStats(me.id)]);
  const t = trails.find((x) => x.status === "ativa");
  return (
    <div className="rounded-3xl border border-line bg-surface p-5">
      <h2 className="font-semibold flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="size-5 text-accent" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 19c4 0 4-6 8-6s4 6 8 6M4 5h4M16 5h4M12 3v6" />
          </svg>
          Trilha de leitura
        </span>
        {stats.streak > 0 && <span className="text-xs font-medium text-[var(--warn)]">🔥 {stats.streak}</span>}
      </h2>
      {t ? (
        <>
          <p className="mt-3 text-sm font-medium line-clamp-1">{t.title}</p>
          <Bar pct={t.total_days ? (t.done_days / t.total_days) * 100 : 0} className="mt-2 !h-2" />
          <p className="mt-1.5 text-xs text-muted tabular-nums">
            {t.done_days}/{t.total_days} dias · {stats.readToday ? "meta de hoje cumprida ✓" : "leitura de hoje pendente"}
          </p>
          {t.next_day && (
            <Link href={`/trilhas/${t.id}/dia/${t.next_day}`} className="mt-4 h-10 rounded-xl bg-accent text-accent-ink text-sm font-medium grid place-items-center hover:brightness-110 transition">
              Ler o dia {t.next_day}
            </Link>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-2">Diga quanto tempo tem por dia e quais leis quer ler. O Legis divide a lei seca em doses diárias.</p>
          <Link href="/trilhas/nova" className="mt-4 h-10 rounded-xl border border-line text-sm font-medium grid place-items-center hover:bg-surface-2 transition">
            Criar uma trilha
          </Link>
        </>
      )}
    </div>
  );
}
