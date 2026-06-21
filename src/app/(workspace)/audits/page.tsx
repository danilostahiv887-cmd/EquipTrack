import { getMovementReferences } from "@/server/services/catalog";
import { getWorkflowPage } from "@/server/services/workflows";
import { cancelAuditAction, deleteAuditAction, finishAuditAction, startAuditAction } from "@/server/actions/workflows";
import { AuditForm, AuditScanForm } from "@/components/workflows/workflow-form";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { label, recordId } from "@/lib/format";

const statusOptions = ["planned", "in_progress", "completed", "cancelled"];

export default async function AuditsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string }> }) {
  await requirePermission("audit:manage");
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const [rows, references] = await Promise.all([getWorkflowPage("audits", page, search), getMovementReferences()]);
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">ІНВЕНТАРИЗАЦІЯ</p>
          <h1>Аудити</h1>
          <p>Перерахунок обладнання в приміщеннях, перевірка фактичного місця й стану.</p>
        </div>
        <Dialog label="Створити аудит" title="Нова інвентаризація"><AuditForm rooms={references.rooms}/></Dialog>
      </header>
      <form className="filter-line">
        <input name="q" defaultValue={search.q} placeholder="Назва аудиту, приміщення, обладнання, стан або результат" />
        <select name="status" defaultValue={search.status ?? ""} aria-label="Фільтр за станом аудиту">
          <option value="">Усі стани</option>
          {statusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}
        </select>
        <button type="submit">Шукати</button>
      </form>
      <WorkflowList
        rows={rows.items}
        actions={(row) => {
          const status = String(row.status ?? "");
          const id = recordId(row.id);
          return (
            <>
              {!["completed", "cancelled"].includes(status) && (
                <Dialog label="Редагувати" title="Редагування аудиту" icon={false} triggerClassName="inline-dialog-trigger">
                  <AuditForm
                    mode="edit"
                    rooms={references.rooms}
                    audit={{
                      id: row.id,
                      title: String(row.title ?? ""),
                      roomId: recordId(row.roomId ?? ""),
                      plannedDate: String(row.plannedDate ?? ""),
                      auditScope: String(row.auditScope ?? ""),
                      expectedItemCount: Number(row.expectedItemCount ?? 0),
                      auditNote: String(row.auditNote ?? ""),
                    }}
                  />
                </Dialog>
              )}
              {status === "planned" && (
                <form action={startAuditAction}>
                  <input type="hidden" name="auditId" value={id} />
                  <ConfirmSubmit label="Почати" title="Почати аудит?" description="Стан зміниться на «У роботі», після чого можна буде вносити знайдені серійні номери." confirmLabel="Почати аудит" />
                </form>
              )}
              {status === "in_progress" && (
                <>
                  <Dialog
                    label="Внести екземпляр"
                    title="Перевірений екземпляр"
                    icon={false}
                    triggerClassName="inline-dialog-trigger"
                    dialogClassName="dialog-wide audit-scan-dialog"
                  >
                    <AuditScanForm auditId={row.id} auditRoomId={recordId(row.roomId ?? "")} equipment={references.equipment} />
                  </Dialog>
                  <form action={finishAuditAction}>
                    <input type="hidden" name="auditId" value={id} />
                    <ConfirmSubmit label="Завершити" title="Завершити аудит?" description="Неперевірені очікувані екземпляри будуть позначені як відсутні." confirmLabel="Завершити аудит" />
                  </form>
                </>
              )}
              {["planned", "in_progress"].includes(status) && (
                <form action={cancelAuditAction}>
                  <input type="hidden" name="auditId" value={id} />
                  <ConfirmSubmit label="Скасувати" title="Скасувати аудит?" description="Аудит залишиться в журналі зі станом «Скасовано»." confirmLabel="Скасувати аудит" tone="danger" />
                </form>
              )}
              <form action={deleteAuditAction}>
                <input type="hidden" name="auditId" value={id} />
                <ConfirmSubmit label="Видалити" title="Видалити аудит?" description="Аудит і всі рядки перевірки будуть видалені без відновлення." confirmLabel="Так, видалити" tone="danger" />
              </form>
            </>
          );
        }}
      />
      <Pagination path="/audits" page={rows.page} total={rows.total} pageSize={rows.pageSize} query={{ q: search.q, status: search.status }} />
    </section>
  );
}
