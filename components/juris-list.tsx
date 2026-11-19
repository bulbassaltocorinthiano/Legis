import type { Juris } from "@/lib/data";
import { formatDate } from "@/lib/format";

const KIND_LABEL: Record<string, string> = {
  sumula_vinculante: "Súmula vinculante",
  sumula: "Súmula",
  repercussao_geral: "Repercussão geral",
  tema_repetitivo: "Tema repetitivo",
  acordao: "Acórdão",
  iac: "IAC",
  puil: "PUIL",
  sirdr: "SIRDR",
};

const PREVIEW = 3;

export function JurisList({ items, articleLabel }: { items: Juris[]; articleLabel: string }) {
  const first = items.slice(0, PREVIEW);
  const rest = items.slice(PREVIEW);
  return (
    <section className="no-print my-4 ml-0 sm:ml-4 rounded-2xl border border-line bg-surface font-sans text-sm" aria-label={`Jurisprudência sobre ${articleLabel}`}>
      <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-line">
        <p className="font-medium text-ink">
          Jurisprudência · {articleLabel.replace(/\.$/, "")}
        </p>
        <span className="text-xs text-muted">{items.length} {items.length === 1 ? "julgado" : "julgados"}</span>
      </header>
      <ul className="divide-y divide-line">
        {first.map((j) => (
          <JurisItem key={`${j.id}-${j.article_key}`} j={j} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="group border-t border-line">
          <summary className="cursor-pointer list-none px-4 py-2.5 text-accent hover:underline">
            <span className="group-open:hidden">Ver mais {rest.length}</span>
            <span className="hidden group-open:inline">Mostrar menos</span>
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {rest.map((j) => (
              <JurisItem key={`${j.id}-${j.article_key}`} j={j} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function JurisItem({ j }: { j: Juris }) {
  const text = j.summary ?? j.body ?? "";
  const isTese = j.kind !== "acordao";
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-md bg-[#0f1b3d] text-white text-[10px] font-semibold px-1.5 py-0.5 tracking-wide">{j.court}</span>
        <span className="text-[11px] uppercase tracking-wide text-muted">{KIND_LABEL[j.kind] ?? j.kind}</span>
        <span className="font-semibold text-ink">{j.title}</span>
        {j.detail && <span className="text-xs text-muted">({j.detail})</span>}
        {j.status && <span className="text-[11px] rounded-md bg-surface-2 px-1.5 py-0.5 text-ink-2">{j.status}</span>}
      </div>
      {text && (
        <details className="group mt-1.5">
          <summary className="list-none cursor-pointer">
            <p className={`text-ink-2 leading-relaxed ${isTese ? "" : "whitespace-pre-line"} line-clamp-3 group-open:line-clamp-none`}>
              {isTese && j.summary ? <span className="font-medium text-ink">Tese: </span> : null}
              {text}
            </p>
            <span className="text-xs text-accent group-open:hidden">ler mais</span>
          </summary>
          {isTese && j.body && j.summary && (
            <p className="mt-2 text-ink-2 leading-relaxed">
              <span className="font-medium text-ink">Questão: </span>
              {j.body}
            </p>
          )}
        </details>
      )}
      <p className="mt-1.5 text-xs text-muted flex flex-wrap gap-x-3">
        {j.organ && <span>{j.organ}</span>}
        {j.rapporteur && <span>{j.rapporteur}</span>}
        {j.judged_at && <span>julgado em {formatDate(j.judged_at)}</span>}
        {j.url && (
          <a href={j.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            ver no {j.court} ↗
          </a>
        )}
        {j.method === "texto" && <span title="Vínculo identificado pela citação do artigo no texto da tese">vínculo automático</span>}
      </p>
    </li>
  );
}
