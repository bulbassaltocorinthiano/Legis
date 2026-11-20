import Link from "next/link";
import { Fragment } from "react";
import { LawText } from "@/components/law-text";
import { NoteCards } from "@/components/note-cards";
import type { NodeRow, Note } from "@/lib/data";
import type { buildMatcher } from "@/lib/text/terms";

const STRUCT = new Set(["parte", "livro", "titulo", "subtitulo", "capitulo", "secao", "subsecao"]);

/** Texto do trecho do dia, com o mesmo visual e as mesmas âncoras de grifo/nota do leitor da lei. */
export function DayText({ nodes, matcher, slug, normId, notes: mine = [] }: { nodes: NodeRow[]; matcher: ReturnType<typeof buildMatcher>; slug: string; normId: number; notes?: Note[] }) {
  const notesBy = new Map<string, Note[]>();
  for (const nt of mine) notesBy.set(nt.anchor, [...(notesBy.get(nt.anchor) ?? []), nt]);
  let seen = new Set<string>();
  return (
    <>
      {nodes.map((n) => {
        if (n.kind === "artigo") seen = new Set();
        const notes = n.notes?.length ? (
          <>
            {" "}
            {n.notes.map((t, i) => (
              <span key={i} className="nota">
                {t}{" "}
              </span>
            ))}
          </>
        ) : null;
        if (STRUCT.has(n.kind)) {
          return (
            <h2 key={n.id} className={`titulo-estrutura ${n.revoked ? "revogado" : ""}`}>
              {n.label && <span className="block text-[0.72em] font-semibold tracking-[0.12em] uppercase text-muted">{n.label}</span>}
              {n.heading && <span className="block mt-1 text-[0.98em] font-semibold text-ink">{n.heading}</span>}
            </h2>
          );
        }
        if (n.kind === "rubrica") return <p key={n.id} className="rubrica">{n.text}</p>;
        if (["epigrafe", "ementa", "preambulo", "fecho"].includes(n.kind)) return null;
        const indent = n.kind === "artigo" ? 0 : Math.min(n.level, 4);
        const cls = ["dispositivo", n.kind, n.revoked ? "revogado" : "", n.kind === "pena" ? "pena" : ""].join(" ");
        const myNotes = notesBy.get(n.anchor);
        return (
          <Fragment key={n.id}>
            <p id={n.anchor} className={cls} style={indent ? { paddingLeft: `${indent * 1.25}rem` } : undefined}>
              {n.label && (
                <Link href={`/lei/${slug}#${n.anchor}`} className="rotulo hover:text-accent" title="Abrir na lei completa">
                  {n.kind === "pena" ? "Pena –" : n.kind === "inciso" ? `${n.label} –` : n.label}
                </Link>
              )}{" "}
              {n.revoked && !n.text ? (
                <span className="italic">(revogado)</span>
              ) : (
                <span data-hl={n.anchor}>
                  <LawText text={n.text} matcher={matcher} seen={seen} />
                </span>
              )}
              {notes}
            </p>
            {myNotes && <NoteCards normId={normId} notes={myNotes} />}
          </Fragment>
        );
      })}
    </>
  );
}
