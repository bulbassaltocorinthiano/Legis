import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getCoverage } from "@/lib/data";
import { StatusDot } from "@/components/norm-card";
import { formatDateTime } from "@/lib/format";
import { refreshNormAction, setSourceUrlAction } from "../actions";
import { AdminNav } from "../nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cobertura" };

const STATUS_LABEL: Record<string, string> = {
  ok: "Disponível",
  pending: "Na fila",
  not_found: "Não localizada",
  error: "Erro",
  unsupported: "Fonte não integrada",
};

export default async function CoberturaPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const cov = await getCoverage();
  const total = Object.values(cov.byStatus).reduce((a, b) => a + b, 0);
  const list = status ? cov.norms.filter((n) => n.status === status) : cov.norms.filter((n) => n.status !== "ok");
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 sm:py-12">
      <AdminNav current="cobertura" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Cobertura e atualizações</h1>
      <p className="mt-1 text-ink-2">
        {cov.byStatus.ok ?? 0} de {total} normas do catálogo com texto oficial disponível.
      </p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_LABEL).map(([k, label]) => (
          <Link key={k} href={`/admin/cobertura?status=${k}`} className={`rounded-2xl border bg-surface p-4 ${status === k ? "border-accent" : "border-line"}`}>
            <p className="text-xs text-muted flex items-center gap-1.5">
              <StatusDot status={k} />
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{cov.byStatus[k] ?? 0}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">Jurisprudência STJ</p>
          <p className="mt-1">
            <span className="text-xl font-semibold tabular-nums">{cov.juris?.temas ?? 0}</span> temas ·{" "}
            <span className="text-xl font-semibold tabular-nums">{cov.juris?.acordaos ?? 0}</span> acórdãos
          </p>
          <p className="text-xs text-muted mt-1">{cov.juris?.links ?? 0} vínculos com artigos</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 sm:col-span-2">
          <p className="text-xs text-muted">Últimas execuções do robô</p>
          <ul className="mt-1 space-y-1">
            {cov.runs.slice(0, 4).map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span>{formatDateTime(r.started_at)}</span>
                <span className="text-muted tabular-nums">
                  {r.checked} conferidas · {r.changed} novas/alteradas · {r.failed} falhas
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {cov.changes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Alterações detectadas</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {cov.changes.map((c, i) => (
              <li key={i}>
                <Link href={`/lei/${c.slug}`} className="hover:text-accent">
                  {c.title}
                </Link>{" "}
                <span className="text-muted">· {formatDateTime(c.detected_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          {status ? STATUS_LABEL[status] : "Pendências"} ({list.length})
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted border-b border-line">
              <tr>
                <th className="px-4 py-3 font-medium">Norma</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Situação</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">Conferida</th>
                <th className="px-4 py-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((n) => (
                <tr key={n.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium flex items-center gap-2">
                      <StatusDot status={n.status} />
                      {n.status === "ok" ? <Link href={`/lei/${n.slug}`} className="hover:text-accent">{n.title}</Link> : n.title}
                    </p>
                    <p className="text-xs text-muted">{n.nickname ?? n.description}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-ink-2 max-w-xs">
                    {STATUS_LABEL[n.status]}
                    {n.status_detail && <span className="block text-muted">{n.status_detail}</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted whitespace-nowrap">{n.checked_at ? formatDateTime(n.checked_at) : "—"}</td>
                  <td className="px-4 py-3">
                    {n.status !== "unsupported" && (
                      <div className="flex flex-col gap-2 min-w-[220px]">
                        <form action={refreshNormAction}>
                          <input type="hidden" name="id" value={n.id} />
                          <button className="h-8 px-3 rounded-lg border border-line text-xs hover:bg-surface-2">Reprocessar agora</button>
                        </form>
                        {n.status !== "ok" && (
                          <form action={setSourceUrlAction} className="flex gap-1">
                            <input type="hidden" name="id" value={n.id} />
                            <input name="url" placeholder="URL do Planalto" className="h-8 flex-1 min-w-0 rounded-lg border border-line bg-surface px-2 text-xs" />
                            <button className="h-8 px-2 rounded-lg bg-accent text-accent-ink text-xs">Usar</button>
                          </form>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
