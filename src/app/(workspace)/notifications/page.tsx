import { getWorkflowPage } from "@/server/services/workflows";
import { markNotificationReadAction } from "@/server/actions/workflows";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { label, recordId } from "@/lib/format";

const typeOptions = ["system", "transfer_request", "equipment_assigned"];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    read?: string;
    type?: string;
  }>;
}) {
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const rows = await getWorkflowPage("notifications", page, search);
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">РОБОЧІ ПОВІДОМЛЕННЯ</p>
          <h1>Сповіщення</h1>
          <p>Події щодо заявок, передач, ремонтів, аудитів і списання.</p>
        </div>
      </header>
      <form className="filter-line">
        <input
          name="q"
          defaultValue={search.q}
          placeholder="Назва, текст, користувач або тип повідомлення"
        />
        <select
          name="read"
          defaultValue={search.read ?? ""}
          aria-label="Фільтр за прочитанням"
        >
          <option value="">Усі повідомлення</option>
          <option value="unread">Непрочитані</option>
          <option value="read">Прочитані</option>
        </select>
        <select
          name="type"
          defaultValue={search.type ?? ""}
          aria-label="Фільтр за типом повідомлення"
        >
          <option value="">Усі типи</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {label(type)}
            </option>
          ))}
        </select>
        <button type="submit">Шукати</button>
      </form>
      <WorkflowList
        rows={rows.items}
        actions={(row) =>
          row.isRead === true ? null : (
            <form action={markNotificationReadAction}>
              <input
                type="hidden"
                name="notificationId"
                value={recordId(row.id)}
              />
              <ConfirmSubmit
                label="Позначити прочитаним"
                title="Позначити сповіщення прочитаним?"
                description="Сповіщення залишиться в журналі, але більше не буде показуватись як нове."
                confirmLabel="Позначити"
              />
            </form>
          )
        }
      />
      <Pagination
        path="/notifications"
        page={rows.page}
        total={rows.total}
        pageSize={rows.pageSize}
        query={{ q: search.q, read: search.read, type: search.type }}
      />
    </section>
  );
}
