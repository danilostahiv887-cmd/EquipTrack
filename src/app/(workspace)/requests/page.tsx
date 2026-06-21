import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getMovementReferences } from "@/server/services/catalog";
import { getWorkflowPage } from "@/server/services/workflows";
import { TransferRequestForm } from "@/components/workflows/workflow-form";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { completeTransferRequestAction, decideTransferRequestAction } from "@/server/actions/workflows";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { label, recordId } from "@/lib/format";

const statusOptions = ["submitted", "approved", "rejected", "completed"];

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string }> }) {
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const [user, rows, references] = await Promise.all([getCurrentUser(), getWorkflowPage("requests", page, search), getMovementReferences()]);
  const canManage = Boolean(user && can(user, "request:manage"));
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">КОНТРОЛЬ ПЕРЕДАЧ</p>
          <h1>Заявки</h1>
          <p>Запити на переміщення, повернення до складу й уточнення місця розташування.</p>
        </div>
        <Dialog label="Нова заявка" title="Запит на переміщення"><TransferRequestForm equipment={references.equipment} rooms={references.rooms}/></Dialog>
      </header>
      <form className="filter-line">
        <input name="q" defaultValue={search.q} placeholder="Обладнання, приміщення, заявник, стан або причина" />
        <select name="status" defaultValue={search.status ?? ""} aria-label="Фільтр за станом заявки">
          <option value="">Усі стани</option>
          {statusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}
        </select>
        <button type="submit">Шукати</button>
      </form>
      <WorkflowList
        rows={rows.items}
        primary="reason"
        actions={(row) => canManage && (row.status === "submitted" || row.status === "approved") ? (
          <>
            {row.status === "submitted" ? (
              <>
                <form action={decideTransferRequestAction}>
                  <input type="hidden" name="requestId" value={recordId(row.id)} />
                  <input type="hidden" name="decision" value="approved" />
                  <ConfirmSubmit label="Погодити" title="Погодити заявку?" description="Після погодження менеджер зможе завершити фактичну передачу обладнання." confirmLabel="Погодити заявку" />
                </form>
                <form action={decideTransferRequestAction}>
                  <input type="hidden" name="requestId" value={recordId(row.id)} />
                  <input type="hidden" name="decision" value="rejected" />
                  <ConfirmSubmit label="Відхилити" title="Відхилити заявку?" description="Заявку буде закрито без переміщення обладнання." confirmLabel="Так, відхилити" tone="danger" />
                </form>
              </>
            ) : (
              <form action={completeTransferRequestAction}>
                <input type="hidden" name="requestId" value={recordId(row.id)} />
                <ConfirmSubmit label="Завершити передачу" title="Завершити передачу?" description="Місце розташування обладнання буде оновлено, а рух потрапить у журнал відповідальності." confirmLabel="Завершити" />
              </form>
            )}
          </>
        ) : null}
      />
      <Pagination path="/requests" page={rows.page} total={rows.total} pageSize={rows.pageSize} query={{ q: search.q, status: search.status }} />
    </section>
  );
}
