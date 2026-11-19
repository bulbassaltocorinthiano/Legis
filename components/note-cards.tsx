"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/lib/data";
import { parseDbTime } from "@/lib/format";
import { deleteNote } from "@/app/(app)/lei/actions";
import { NoteComposer, NoteIcon } from "./markup-layer";

const when = (s: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }).format(parseDbTime(s));

/** Notas pessoais exibidas logo abaixo do dispositivo anotado. */
export function NoteCards({ normId, notes }: { normId: number; notes: Note[] }) {
  return (
    <div className="nota-pessoal-lista my-3 space-y-2 font-sans">
      {notes.map((n) => (
        <NoteCard key={n.id} normId={normId} note={n} />
      ))}
    </div>
  );
}

function NoteCard({ normId, note }: { normId: number; note: Note }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [gone, setGone] = useState(false);
  const [pending, start] = useTransition();
  if (gone) return null;
  const edited = note.updated_at !== note.created_at;
  return (
    <div className="nota-pessoal group relative rounded-2xl border border-[color-mix(in_srgb,var(--gold)_45%,transparent)] bg-[var(--prazo-bg)]/60 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <NoteIcon className="size-3.5 text-[var(--warn)]" />
        <span className="font-medium text-ink-2">Minha nota</span>
        <span>· {when(edited ? note.updated_at : note.created_at)}{edited ? " (editada)" : ""}</span>
        <span className="ml-auto flex gap-1 no-print">
          {confirm ? (
            <>
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await deleteNote(note.id);
                    setGone(true);
                    router.refresh();
                  })
                }
                className="h-7 px-2 rounded-lg bg-err text-white"
              >
                Excluir
              </button>
              <button onClick={() => setConfirm(false)} className="h-7 px-2 rounded-lg hover:bg-surface-2">
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="h-7 px-2 rounded-lg hover:bg-surface/70 text-ink-2">
                Editar
              </button>
              <button onClick={() => setConfirm(true)} className="h-7 px-2 rounded-lg hover:bg-surface/70 text-ink-2">
                Excluir
              </button>
            </>
          )}
        </span>
      </div>
      {note.quote && <p className="mt-2 border-l-2 border-[var(--gold)] pl-2 font-law text-[13px] text-ink-2 line-clamp-2">{note.quote}</p>}
      <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-ink">{note.body}</p>
      {editing && (
        <NoteComposer
          normId={normId}
          target={{ anchor: note.anchor, quote: note.quote, label: "" }}
          existing={{ id: note.id, body: note.body }}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
