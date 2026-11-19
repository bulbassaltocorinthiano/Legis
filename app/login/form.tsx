"use client";
import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, { error: null as string | null });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="block">
        <span className="text-sm font-medium">Login</span>
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          className="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3.5 outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 transition"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Senha</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 w-full h-11 rounded-xl border border-line bg-surface px-3.5 outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 transition"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-err">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="w-full h-11 rounded-xl bg-accent text-accent-ink font-medium hover:opacity-90 disabled:opacity-60 transition"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
