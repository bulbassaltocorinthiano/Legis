import { NextResponse } from "next/server";
import { ensureReady } from "@/lib/bootstrap";
import { runUpdateBatch } from "@/lib/ingest/run";

// Chamado pelo Vercel Cron (ver vercel.json). Confere, por lote, as normas verificadas há mais tempo.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  await ensureReady();
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 40);
  const counts = await runUpdateBatch({ limit: Math.min(limit, 120) });
  return NextResponse.json({ ok: true, counts });
}
