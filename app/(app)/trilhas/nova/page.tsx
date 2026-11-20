import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getPlannableNorms } from "@/lib/trilhas";
import { NewTrailForm } from "@/components/trilhas/new-trail-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova trilha" };

export default async function NovaTrilhaPage({ searchParams }: { searchParams: Promise<{ norma?: string }> }) {
  await requireUser();
  const { norma } = await searchParams;
  const rows = await getPlannableNorms();
  const norms = rows.map((n) => ({
    id: n.id,
    name: n.nickname ?? n.description,
    sub: n.nickname && n.nickname !== n.description ? `${n.description} · ${n.title}` : n.title,
    articles: n.article_count,
    words: n.words,
    area: n.area ? n.area.charAt(0).toUpperCase() + n.area.slice(1) : "Outras",
  }));
  const pre = norma ? rows.filter((r) => r.slug === norma).map((r) => r.id) : [];
  return (
    <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 sm:py-12">
      <Link href="/trilhas" className="text-sm text-muted hover:text-ink">
        ← Trilhas
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nova trilha de leitura</h1>
      <p className="mt-2 text-ink-2 max-w-2xl">Três escolhas e pronto: tempo diário, normas e ritmo. O Legis calcula o tamanho de cada artigo e monta os dias.</p>
      <div className="mt-8">
        {norms.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface p-6 text-ink-2">Nenhuma norma com texto carregado ainda.</p>
        ) : (
          <NewTrailForm norms={norms} preselect={pre} />
        )}
      </div>
    </main>
  );
}
