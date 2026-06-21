import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getMovementReferences } from "@/server/services/catalog";
import { getWorkflowPage } from "@/server/services/workflows";
import { approveWriteoffAction } from "@/server/actions/workflows";
import { WriteoffForm } from "@/components/workflows/workflow-form";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { label, recordId } from "@/lib/format";

const statusOptions = ["proposed", "approved", "completed", "rejected", "cancelled"];

export default async function WriteoffsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string }> }) {
  await requirePermission("writeoff:propose");
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const [user, rows, references] = await Promise.all([getCurrentUser(), getWorkflowPage("writeoffs", page, search), getMovementReferences()]);
  const canApprove = Boolean(user && can(user, "writeoff:approve"));
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">КОНТРОЛЬ СПИСАННЯ</p>
          <h1>Списання</h1>
          <p>Пропозиції щодо вилучення зношеного або непридатного обладнання з фонду.</p>
        </div>
        {user && can(user, "writeoff:propose") && <Dialog label="Подати на списання" title="Нова пропозиція списання"><WriteoffForm equipment={references.equipment}/></Dialog>}
      </header>
      <form className="filter-line">
        <input name="q" defaultValue={search.q} placeholder="Обладнання, причина, стан або відповідальна особа" />
        <select name="status" defaultValue={search.status ?? ""} aria-label="Фільтр за станом списання">
          <option value="">Усі стани</option>
          {statusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}
        </select>
        <button type="submit">Шукати</button>
      </form>
      <WorkflowList
        rows={rows.items}
        primary="reason"
        actions={(row) => canApprove && row.status === "proposed" ? (
          <form action={approveWriteoffAction}>
            <input type="hidden" name="requestId" value={recordId(row.id)} />
            <ConfirmSubmit label="Погодити списання" title="Погодити списання?" description="Обладнання буде переведено у статус списаного, а рух потрапить у журнал." confirmLabel="Погодити списання" tone="danger" />
          </form>
        ) : null}
      />
      <Pagination path="/writeoffs" page={rows.page} total={rows.total} pageSize={rows.pageSize} query={{ q: search.q, status: search.status }} />
    </section>
  );
}
