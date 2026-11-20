"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { completeDay, createTrail, deleteTrail, uncompleteDay, type Celebration } from "@/lib/trilhas";
import { PACES, type Pace } from "@/lib/trilhas/plan";

export type TrailFormState = { error?: string };

export async function createTrailAction(_: TrailFormState, form: FormData): Promise<TrailFormState> {
  const me = await requireUser();
  const minutes = Math.round(Number(form.get("minutes")));
  const pace = String(form.get("pace") ?? "normal") as Pace;
  const reviewEvery = Number(form.get("review") ?? 0);
  const normIds = String(form.get("norms") ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const title = String(form.get("title") ?? "").trim().slice(0, 80);
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 480) return { error: "Escolha entre 5 minutos e 8 horas por dia." };
  if (!(pace in PACES)) return { error: "Ritmo inválido." };
  if (![0, 4, 6, 9].includes(reviewEvery)) return { error: "Opção de revisão inválida." };
  if (!normIds.length) return { error: "Escolha pelo menos uma norma." };
  if (normIds.length > 40) return { error: "Escolha no máximo 40 normas por trilha." };
  let id: number;
  try {
    id = await createTrail(me.id, { title: title || "Minha trilha", minutes, pace, reviewEvery, normIds: [...new Set(normIds)] });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/trilhas");
  redirect(`/trilhas/${id}?nova=1`);
}

export async function completeDayAction(trailId: number, dayNo: number): Promise<Celebration | null> {
  const me = await requireUser();
  if (!Number.isInteger(trailId) || !Number.isInteger(dayNo)) return null;
  const r = await completeDay(me.id, trailId, dayNo);
  revalidatePath(`/trilhas/${trailId}`);
  revalidatePath("/trilhas");
  return r;
}

export async function uncompleteDayAction(trailId: number, dayNo: number) {
  const me = await requireUser();
  if (!Number.isInteger(trailId) || !Number.isInteger(dayNo)) return;
  await uncompleteDay(me.id, trailId, dayNo);
  revalidatePath(`/trilhas/${trailId}`);
  revalidatePath(`/trilhas/${trailId}/dia/${dayNo}`);
}

export async function deleteTrailAction(form: FormData) {
  const me = await requireUser();
  await deleteTrail(me.id, Number(form.get("id")));
  revalidatePath("/trilhas");
  redirect("/trilhas");
}
