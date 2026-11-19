import { requireUser } from "@/lib/auth";
import { ActionForm, inputCls } from "@/components/forms";
import { changeOwnPasswordAction } from "../admin/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const me = await requireUser();
  return (
    <main className="mx-auto max-w-md px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Minha conta</h1>
      <p className="mt-1 text-ink-2">
        {me.name} · @{me.username}
      </p>
      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Alterar senha</h2>
        <ActionForm action={changeOwnPasswordAction} submit="Alterar senha" className="mt-4 space-y-3">
          <label className="block text-sm">
            Senha atual
            <input name="current" type="password" autoComplete="current-password" required className={`${inputCls} mt-1`} />
          </label>
          <label className="block text-sm">
            Nova senha
            <input name="password" type="password" autoComplete="new-password" required className={`${inputCls} mt-1`} />
          </label>
          <label className="block text-sm">
            Confirmar nova senha
            <input name="confirm" type="password" autoComplete="new-password" required className={`${inputCls} mt-1`} />
          </label>
        </ActionForm>
      </section>
    </main>
  );
}
