import Link from "next/link";
import type { NormSummary } from "@/lib/data";

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    ok: ["bg-ok", "Texto disponível"],
    pending: ["bg-muted", "Aguardando ingestão"],
    not_found: ["bg-warn", "Fonte não localizada"],
    error: ["bg-err", "Erro na leitura"],
    unsupported: ["bg-line", "Fonte ainda não integrada"],
  };
  const [cls, label] = map[status] ?? ["bg-muted", status];
  return <span className={`inline-block size-2 rounded-full ${cls}`} title={label} aria-label={label} />;
}

export function NormCard({ n }: { n: NormSummary }) {
  const available = n.status === "ok";
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted flex items-center gap-2">
            <StatusDot status={n.status} />
            {n.title}
          </p>
          <h3 className="mt-1 font-medium leading-snug text-ink">{n.nickname ?? n.description}</h3>
          {n.nickname && <p className="text-sm text-ink-2 mt-0.5 line-clamp-2">{n.description}</p>}
          {n.note && <p className="text-xs text-warn mt-1.5">{n.note}</p>}
        </div>
        {available && (
          <span className="shrink-0 text-xs text-muted tabular-nums">{n.article_count} art.</span>
        )}
      </div>
      {!available && (
        <p className="text-xs text-muted mt-2">
          {n.status === "unsupported" ? "Fonte oficial ainda não integrada" : n.status === "pending" ? "Aguardando ingestão" : "Em revisão: endereço oficial não localizado"}
        </p>
      )}
    </>
  );
  const cls =
    "block rounded-2xl border border-line bg-surface p-4 transition " +
    (available ? "hover:border-accent/40 hover:shadow-[var(--shadow)]" : "opacity-70");
  return available ? (
    <Link href={`/lei/${n.slug}`} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
