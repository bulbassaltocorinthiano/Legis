import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getTerm, getTerms } from "@/lib/data";
import { ActionForm, inputCls } from "@/components/forms";
import { deleteTermAction, saveTermAction } from "../actions";
import { AdminNav } from "../nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editar doutrina" };

export default async function AdminDoutrina({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  await requireAdmin();
  const { editar } = await searchParams;
  const [terms, current] = await Promise.all([getTerms(), editar ? getTerm(editar) : null]);
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 sm:py-12">
      <AdminNav current="doutrina" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Biblioteca doutrinária</h1>
      <p className="mt-1 text-ink-2">{terms.length} verbetes. Termos e sinônimos cadastrados aqui passam a ser sublinhados no texto das leis da área correspondente.</p>

      <div className="mt-8 grid lg:grid-cols-[1fr_420px] gap-8 items-start">
        <ul className="rounded-2xl border border-line bg-surface divide-y divide-line">
          {terms.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="font-medium truncate">{t.term}</p>
                <p className="text-xs text-muted">{t.area}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/admin/doutrina?editar=${t.slug}`} className="h-8 px-3 rounded-lg border border-line text-xs grid place-items-center hover:bg-surface-2">
                  Editar
                </Link>
                <form action={deleteTermAction}>
                  <input type="hidden" name="slug" value={t.slug} />
                  <button className="h-8 px-3 rounded-lg border border-line text-xs text-err hover:bg-surface-2">Excluir</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
        <section className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24" key={current?.slug ?? "novo"}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{current ? `Editar: ${current.term}` : "Novo verbete"}</h2>
            {current && (
              <Link href="/admin/doutrina" className="text-xs text-accent">
                + novo
              </Link>
            )}
          </div>
          <ActionForm action={saveTermAction} submit="Salvar verbete" className="mt-4 space-y-3">
            <input type="hidden" name="original_slug" value={current?.slug ?? ""} />
            <Field label="Termo" name="term" defaultValue={current?.term} required />
            <Field label="Sinônimos / variações (separados por vírgula)" name="aliases" defaultValue={current?.aliases.join(", ")} />
            <Field label="Área" name="area" defaultValue={current?.area ?? "Civil"} />
            <Field label="Definição curta" name="short_definition" defaultValue={current?.short_definition} required />
            <label className="block text-sm">
              Explicação
              <textarea name="definition" defaultValue={current?.definition} required rows={6} className={`${inputCls} h-auto py-2 mt-1`} />
            </label>
            <Field label="Base legal" name="legal_basis" defaultValue={current?.legal_basis ?? ""} />
            <Field label="Exemplo (opcional)" name="example" defaultValue={current?.example ?? ""} />
          </ActionForm>
        </section>
      </div>
    </main>
  );
}

function Field({ label, name, defaultValue, required }: { label: string; name: string; defaultValue?: string; required?: boolean }) {
  return (
    <label className="block text-sm">
      {label}
      <input name={name} defaultValue={defaultValue} required={required} className={`${inputCls} mt-1`} />
    </label>
  );
}
