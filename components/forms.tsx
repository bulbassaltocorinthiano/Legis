"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/(app)/admin/actions";

export const inputCls =
  "w-full h-10 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";

export function ActionForm({
  action,
  children,
  submit,
  className,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit: string;
  className?: string;
}) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className={className ?? "space-y-3"}>
      {children}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="h-10 px-4 rounded-xl bg-accent text-accent-ink text-sm font-medium disabled:opacity-60">
          {pending ? "Salvando…" : submit}
        </button>
        {state.ok && <p className="text-sm text-ok">{state.ok}</p>}
        {state.error && (
          <p role="alert" className="text-sm text-err">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
