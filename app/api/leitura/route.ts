import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordReading } from "@/lib/estatisticas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  let body: { normId?: unknown; anchors?: unknown; seconds?: unknown };
  try {
    body = JSON.parse((await req.text()).slice(0, 20000));
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }
  const normId = Number(body.normId);
  const anchors = Array.isArray(body.anchors) ? body.anchors : [];
  const seconds = Number(body.seconds) || 0;
  if (!Number.isInteger(normId) || normId <= 0) return NextResponse.json({ error: "norma inválida" }, { status: 400 });
  await recordReading(me.id, normId, anchors, seconds);
  return NextResponse.json({ ok: true });
}
