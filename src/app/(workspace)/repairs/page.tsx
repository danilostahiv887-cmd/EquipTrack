import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getMovementReferences } from "@/server/services/catalog";
import { getWorkflowPage } from "@/server/services/workflows";
import { transitionRepairAction } from "@/server/actions/workflows";
import { RepairForm } from "@/components/workflows/workflow-form";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { label, recordId } from "@/lib/format";

const statusOptions = ["reported", "under_review", "sent_to_repair", "repaired", "not_repairable", "cancelled"];
const severityOptions = ["low", "medium", "high"];

const transitions: Record<string, Array<{ status: string; label: string; confirm: string; tone?: "danger" }>> = {
  reported: [
    { status: "under_review", label: "Взяти в роботу", confirm: "Взяти на перевірку" },
    { status: "cancelled", label: "Скасувати", confirm: "Скасувати повідомлення", tone: "danger" },
  ],
  under_review: [
    { status: "sent_to_repair", label: "Передати в ремонт", confirm: "Передати обладнання в ремонт" },
    { status: "repaired", label: "Повернути в роботу", confirm: "Позначити як відремонтоване" },
    { status: "not_repairable", label: "Непридатне", confirm: "Позначити як непридатне", tone: "danger" },
    { status: "cancelled", label: "Скасувати", confirm: "Скасувати ремонт", tone: "danger" },
  ],
  sent_to_repair: [
    { status: "repaired", label: "Повернути з ремонту", confirm: "Повернути обладнання з ремонту" },
    { status: "not_repairable", label: "Непридатне", confirm: "Позначити як непридатне", tone: "danger" },
    { status: "cancelled", label: "Скасувати", confirm: "Скасувати ремонт", tone: "danger" },
  ],
};

export default async function RepairsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string; severity?: string }> }) {
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const [user, rows, references] = await Promise.all([getCurrentUser(), getWorkflowPage("repairs", page, search), getMovementReferences()]);
  const canManage = Boolean(user && can(user, "repair:manage"));
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">ТЕХНІЧНИЙ СТАН</p>
          <h1>Ремонти</h1>
          <p>Повідомлення про несправності, діагностику й повернення обладнання до роботи.</p>
        </div>
        <Dialog label="Повідомити про несправність" title="Нове повідомлення про ремонт"><RepairForm equipment={references.equipment} rooms={references.rooms}/></Dialog>
      </header>
      <form className="filter-line">
        <input name="q" defaultValue={search.q} placeholder="Обладнання, приміщення, опис, серйозність або стан" />
        <select name="status" defaultValue={search.status ?? ""} aria-label="Фільтр за станом ремонту">
          <option value="">Усі стани</option>
          {statusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}
        </select>
        <select name="severity" defaultValue={search.severity ?? ""} aria-label="Фільтр за серйозністю">
          <option value="">Усі серйозності</option>
          {severityOptions.map((severity) => <option key={severity} value={severity}>{label(severity)}</option>)}
        </select>
        <button type="submit">Шукати</button>
      </form>
      <WorkflowList
        rows={rows.items}
        primary="issueDescription"
        actions={(row) => canManage ? (
          <>
            {(transitions[String(row.status ?? "")] ?? []).map((transition) => (
              <form key={transition.status} action={transitionRepairAction}>
                <input type="hidden" name="repairId" value={recordId(row.id)} />
                <input type="hidden" name="status" value={transition.status} />
                <ConfirmSubmit
                  label={transition.label}
                  title={`${transition.label}?`}
                  description="Стан ремонту буде оновлено, а відповідний рух обладнання потрапить у журнал, якщо він потрібний для цього переходу."
                  confirmLabel={transition.confirm}
                  tone={transition.tone}
                />
              </form>
            ))}
          </>
        ) : null}
      />
      <Pagination path="/repairs" page={rows.page} total={rows.total} pageSize={rows.pageSize} query={{ q: search.q, status: search.status, severity: search.severity }} />
    </section>
  );
}
