import { getUsers } from "@/server/services/admin";
import { deactivateUserAction } from "@/server/actions/users";
import { UserForm } from "@/components/admin/user-form";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePermission } from "@/lib/auth/guards";
import { Dialog } from "@/components/ui/dialog";
import { label, recordId } from "@/lib/format";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";

const roleOptions = ["admin", "inventory_manager", "staff"];
const statusOptions = ["active", "inactive"];

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    role?: string;
    status?: string;
  }>;
}) {
  await requirePermission("user:manage");
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const data = await getUsers(page, search);

  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">ДОСТУП ДО СИСТЕМИ</p>
          <h1>Користувачі</h1>
          <p>
            Створення працівників і менеджерів, ролі та контроль активних
            облікових записів.
          </p>
        </div>
        <Dialog label="Створити користувача" title="Новий обліковий запис">
          <UserForm />
        </Dialog>
      </header>

      <form className="filter-line">
        <input
          name="q"
          defaultValue={search.q}
          placeholder="ПІБ, email, посада або роль"
        />
        <select
          name="role"
          defaultValue={search.role ?? ""}
          aria-label="Фільтр за роллю"
        >
          <option value="">Усі ролі</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {label(role)}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={search.status ?? ""}
          aria-label="Фільтр за станом користувача"
        >
          <option value="">Усі стани</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {label(status)}
            </option>
          ))}
        </select>
        <button type="submit">Шукати</button>
      </form>

      <div className="workflow-list">
        {data.items.map((item) => (
          <article key={recordId(item.id)}>
            <div className="workflow-row-main">
              <strong>{String(item.fullName)}</strong>
              <small>
                {String(item.email)} · {label(item.role)} ·{" "}
                {String(item.position ?? "Посаду не вказано")}
              </small>
            </div>
            <StatusBadge status={String(item.status)} />
            <div className="workflow-row-actions">
              <Dialog
                label="Редагувати"
                title="Редагування користувача"
                icon={false}
                triggerClassName="inline-dialog-trigger"
              >
                <UserForm
                  mode="edit"
                  user={{
                    id: item.id,
                    fullName: String(item.fullName ?? ""),
                    email: String(item.email ?? ""),
                    role: String(item.role ?? "staff"),
                    status: String(item.status ?? "active"),
                    position: String(item.position ?? ""),
                  }}
                />
              </Dialog>
              {item.status === "active" && (
                <form action={deactivateUserAction}>
                  <input
                    name="userId"
                    type="hidden"
                    value={recordId(item.id)}
                  />
                  <ConfirmSubmit
                    label="Деактивувати"
                    title="Деактивувати користувача?"
                    description={`Обліковий запис ${String(item.fullName)} більше не зможе входити в систему.`}
                    confirmLabel="Так, деактивувати"
                    tone="danger"
                  />
                </form>
              )}
            </div>
          </article>
        ))}
        {data.items.length === 0 && (
          <p>Користувачів за такими умовами не знайдено.</p>
        )}
      </div>

      <Pagination
        path="/users"
        page={data.page}
        total={data.total}
        pageSize={data.pageSize}
        query={{ q: search.q, role: search.role, status: search.status }}
      />
    </section>
  );
}
