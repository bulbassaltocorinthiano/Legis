import { MAX_USERS, requireAdmin } from "@/lib/auth";
import { q } from "@/lib/db";
import { ActionForm, inputCls } from "@/components/forms";
import { createUserAction, deleteUserAction, resetPasswordAction, toggleUserAction } from "../actions";
import { formatDateTime } from "@/lib/format";
import { AdminNav } from "../nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const me = await requireAdmin();
  const users = await q<{ id: number; username: string; name: string; role: string; active: boolean; created_at: string; last_login_at: string | null }>(
    `SELECT id, username, name, role, active, created_at::text, last_login_at::text FROM users ORDER BY created_at`,
  );
  const full = users.length >= MAX_USERS;
  return (
    <main className="mx-auto max-w-[1100px] px-4 sm:px-6 py-8 sm:py-12">
      <AdminNav current="usuarios" />
      <div className="flex items-end justify-between gap-4 mt-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-ink-2 mt-1">
            {users.length} de {MAX_USERS} vagas usadas. Não há cadastro aberto: só administradores criam acessos.
          </p>
        </div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden max-w-md">
        <div className={`h-full ${full ? "bg-err" : "bg-accent"}`} style={{ width: `${(users.length / MAX_USERS) * 100}%` }} />
      </div>

      <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {u.name}{" "}
                    {u.role === "admin" && <span className="ml-1 text-[11px] rounded-md bg-accent-soft text-accent px-1.5 py-0.5">admin</span>}
                    {!u.active && <span className="ml-1 text-[11px] rounded-md bg-surface-2 text-muted px-1.5 py-0.5">bloqueado</span>}
                  </p>
                  <p className="text-sm text-muted">
                    @{u.username} · último acesso {u.last_login_at ? formatDateTime(u.last_login_at) : "nunca"}
                  </p>
                </div>
                {u.id !== me.id && (
                  <div className="flex gap-2">
                    <form action={toggleUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className="h-9 px-3 rounded-lg border border-line text-sm hover:bg-surface-2">{u.active ? "Bloquear" : "Desbloquear"}</button>
                    </form>
                    <form action={deleteUserAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <button className="h-9 px-3 rounded-lg border border-line text-sm text-err hover:bg-surface-2">Excluir</button>
                    </form>
                  </div>
                )}
              </div>
              <details className="mt-3">
                <summary className="text-sm text-accent cursor-pointer">Redefinir senha</summary>
                <ActionForm action={resetPasswordAction} submit="Redefinir" className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-start">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="password" type="text" placeholder="Nova senha (mín. 8, letras e números)" className={`${inputCls} sm:max-w-xs`} required />
                </ActionForm>
              </details>
            </li>
          ))}
        </ul>

        <section className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Novo usuário</h2>
          {full ? (
            <p className="mt-2 text-sm text-ink-2">O limite de {MAX_USERS} usuários foi atingido. Exclua um acesso para liberar vaga.</p>
          ) : (
            <ActionForm action={createUserAction} submit="Criar acesso" className="mt-4 space-y-3">
              <label className="block text-sm">
                Nome
                <input name="name" className={`${inputCls} mt-1`} required />
              </label>
              <label className="block text-sm">
                Login
                <input name="username" className={`${inputCls} mt-1`} autoCapitalize="none" required />
              </label>
              <label className="block text-sm">
                Senha inicial
                <input name="password" type="text" className={`${inputCls} mt-1`} required />
              </label>
              <label className="block text-sm">
                Perfil
                <select name="role" className={`${inputCls} mt-1`}>
                  <option value="user">Leitor</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
            </ActionForm>
          )}
        </section>
      </div>
    </main>
  );
}
