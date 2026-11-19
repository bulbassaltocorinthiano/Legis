import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTerm, searchTerms } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const q = url.searchParams.get("q") ?? "";
  const pick = (t: Awaited<ReturnType<typeof getTerm>>) =>
    t && { slug: t.slug, term: t.term, area: t.area, short_definition: t.short_definition, definition: t.definition, legal_basis: t.legal_basis };
  if (slug) {
    const t = await getTerm(slug);
    return NextResponse.json(t ? [pick(t)] : []);
  }
  const rows = await searchTerms(q.slice(0, 80), 5);
  return NextResponse.json(rows.map(pick));
}
