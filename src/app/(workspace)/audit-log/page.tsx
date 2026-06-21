import { getWorkflowPage } from "@/server/services/workflows";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";
import { label } from "@/lib/format";

const actionOptions = ["equipment.updated", "audit.completed", "movement.created", "transfer.completed", "repair.updated"];
const entityOptions = ["equipment", "audit", "repair", "transfer_request", "room"];

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; action?: string; entity?: string }> }) {
  await requirePermission("user:manage");
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const rows = await getWorkflowPage("auditLog", page, search);
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">НЕЗМІННА ІСТОРІЯ</p>
          <h1>Журнал дій</h1>
          <p>Події створення, редагування, погодження й видалення записів.</p>
        </div>
      </header>
      <form className="filter-line">
        <input name="q" defaultValue={search.q} placeholder="Дія, виконавець, об’єкт або дата" />
        <select name="action" defaultValue={search.action ?? ""} aria-label="Фільтр за дією">
          <option value="">Усі дії</option>
          {actionOptions.map((action) => <option key={action} value={action}>{label(action)}</option>)}
        </select>
        <select name="entity" defaultValue={search.entity ?? ""} aria-label="Фільтр за сутністю">
          <option value="">Усі сутності</option>
          {entityOptions.map((entity) => <option key={entity} value={entity}>{label(entity)}</option>)}
        </select>
        <button type="submit">Шукати</button>
      </form>
      <WorkflowList rows={rows.items} primary="action" />
      <Pagination path="/audit-log" page={rows.page} total={rows.total} pageSize={rows.pageSize} query={{ q: search.q, action: search.action, entity: search.entity }} />
    </section>
  );
}
