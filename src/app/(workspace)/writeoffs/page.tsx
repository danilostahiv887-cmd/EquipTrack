import { can } from "@/lib/auth/permissions";
import { getWriteoffPage } from "@/server/services/workflows";
import {
  approveWriteoffAction,
  cancelWriteoffAction,
  completeWriteoffAction,
  rejectWriteoffAction,
} from "@/server/actions/workflows";
import { WriteoffFormLoader } from "@/components/workflows/writeoff-form-loader";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { label, recordId } from "@/lib/format";

const statusOptions = [
  "proposed",
  "approved",
  "completed",
  "rejected",
  "cancelled",
];

export default async function WriteoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const user = await requirePermission("writeoff:propose");
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const rows = await getWriteoffPage(page, search);
  const canApprove = can(user, "writeoff:approve");
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">КОНТРОЛЬ СПИСАННЯ</p>
          <h1>Списання</h1>
          <p>
            Пропозиції щодо вилучення зношеного або непридатного обладнання з
            фонду.
          </p>
        </div>
        <Dialog label="Подати на списання" title="Нова пропозиція списання">
          <WriteoffFormLoader />
        </Dialog>
      </header>
      <ol className="writeoff-route" aria-label="Маршрут контролю списання">
        <li>
          <b>1</b>
          <span>
            <strong>Запропоновано</strong>Менеджер подає обґрунтування.
          </span>
        </li>
        <li>
          <b>2</b>
          <span>
            <strong>Погоджено</strong>Адміністратор ухвалює рішення.
          </span>
        </li>
        <li>
          <b>3</b>
          <span>
            <strong>Завершено</strong>Підтверджується фактичне вилучення з
            фонду.
          </span>
        </li>
      </ol>
      <form className="filter-line">
        <input
          name="q"
          defaultValue={search.q}
          placeholder="Обладнання, причина, стан або відповідальна особа"
        />
        <select
          name="status"
          defaultValue={search.status ?? ""}
          aria-label="Фільтр за станом списання"
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
      <WorkflowList
        rows={rows.items}
        primary="reason"
        actions={(row) => {
          const status = String(row.status ?? "");
          const requestId = recordId(row.id);
          const isOwner = recordId(row.proposedBy) === recordId(user.id);
          return (
            <>
              {status === "proposed" && canApprove && (
                <form action={approveWriteoffAction}>
                  <input type="hidden" name="requestId" value={requestId} />
                  <ConfirmSubmit
                    label="Погодити"
                    title="Погодити списання?"
                    description="Заявка перейде у стан «Погоджено». Екземпляр ще не буде списаний: менеджер має окремо підтвердити фактичне вилучення."
                    confirmLabel="Погодити"
                  />
                </form>
              )}
              {status === "proposed" && canApprove && (
                <form action={rejectWriteoffAction}>
                  <input type="hidden" name="requestId" value={requestId} />
                  <ConfirmSubmit
                    label="Відхилити"
                    title="Відхилити списання?"
                    description="Пропозиція буде закрита, а екземпляр залишиться в активному фонді."
                    confirmLabel="Відхилити"
                    tone="danger"
                  />
                </form>
              )}
              {status === "proposed" && (isOwner || canApprove) && (
                <form action={cancelWriteoffAction}>
                  <input type="hidden" name="requestId" value={requestId} />
                  <ConfirmSubmit
                    label="Скасувати"
                    title="Скасувати пропозицію?"
                    description="Скасовану пропозицію не можна буде погодити. За потреби створіть нову з актуальним обґрунтуванням."
                    confirmLabel="Скасувати"
                    tone="danger"
                  />
                </form>
              )}
              {status === "approved" && (
                <form action={completeWriteoffAction}>
                  <input type="hidden" name="requestId" value={requestId} />
                  <ConfirmSubmit
                    label="Підтвердити списання"
                    title="Підтвердити фактичне списання?"
                    description="Екземпляр буде вилучено з активного фонду, отримає стан «Списано», а рух з’явиться в журналі."
                    confirmLabel="Завершити списання"
                    tone="danger"
                  />
                </form>
              )}
            </>
          );
        }}
      />
      <Pagination
        path="/writeoffs"
        page={rows.page}
        total={rows.total}
        pageSize={rows.pageSize}
        query={{ q: search.q, status: search.status }}
      />
    </section>
  );
}
