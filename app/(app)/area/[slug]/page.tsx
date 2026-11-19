import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, getNormsByCategory } from "@/lib/data";
import { NormCard } from "@/components/norm-card";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getCategory((await params).slug);
  return { title: c?.title ?? "Área" };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getCategory((await params).slug);
  if (!c) notFound();
  const norms = await getNormsByCategory(c.id);
  const ok = norms.filter((n) => n.status === "ok").length;
  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 sm:py-12">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          Legislação
        </Link>{" "}
        / {c.sphere === "federal" ? "Federal" : "Maranhão"}
      </nav>
      <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">{c.title}</h1>
      <p className="mt-2 text-ink-2">
        {ok} de {norms.length} normas com texto disponível.
      </p>
      <ul className="mt-8 grid sm:grid-cols-2 gap-3">
        {norms.map((n) => (
          <li key={n.id}>
            <NormCard n={n} />
          </li>
        ))}
      </ul>
    </main>
  );
}
