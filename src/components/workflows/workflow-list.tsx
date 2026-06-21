import type { ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime, label, recordId } from "@/lib/format";
import type { WorkflowRecord } from "@/server/services/workflows";

const fieldLabels: Record<string, string> = {
  title: "Назва",
  body: "Повідомлення",
  type: "Тип",
  userId: "Користувач",
  isRead: "Прочитано",
  movementType: "Тип переміщення",
  equipmentId: "Обладнання",
  fromRoomId: "Звідки",
  toRoomId: "Куди",
  toResponsibleId: "Відповідальна особа",
  acceptedBy: "Прийняв",
  performedBy: "Виконав",
  requestedBy: "Заявник",
  approvedBy: "Погодив",
  completedBy: "Завершив",
  reportedBy: "Повідомив",
  proposedBy: "Запропонував",
  createdBy: "Створив",
  checkedBy: "Перевірив",
  handledBy: "Відповідальний за ремонт",
  rejectedBy: "Відхилив",
  actorId: "Виконавець",
  reason: "Причина",
  action: "Дія",
  entityType: "Сутність",
  entityId: "Запис",
  issueDescription: "Опис несправності",
  severity: "Серйозність",
  roomId: "Приміщення",
  auditScope: "Що перевіряємо",
  expectedItemCount: "Очікувана кількість",
  expectedRegisteredCount: "Очікувано за обліком",
  actualItemCount: "Фактично знайдено",
  itemCountDelta: "Різниця кількості",
  auditItemPreview: "Автоматично сформований перелік",
  auditResult: "Підсумок перевірки",
  auditProblems: "Проблемні позиції",
  auditNote: "Примітка для перевірки",
  writeoffProgress: "Маршрут списання",
  quantity: "Кількість",
  status: "Стан",
  plannedDate: "Планова дата",
  movementDate: "Дата переміщення",
  createdAt: "Створено",
  approvedAt: "Погоджено",
  rejectedAt: "Відхилено",
  updatedAt: "Оновлено",
  completedAt: "Завершено",
  readAt: "Прочитано о",
};

const hiddenFields = new Set(["id", "passwordHash", "__display", "__title", "__subtitle", "__search"]);
const preferredOrder = [
  "movementType", "title", "body", "type", "status", "equipmentId", "fromRoomId", "toRoomId", "roomId",
  "quantity", "auditScope", "expectedItemCount", "expectedRegisteredCount", "actualItemCount", "itemCountDelta", "auditItemPreview", "auditResult", "auditProblems", "auditNote", "writeoffProgress", "reason", "issueDescription", "severity", "requestedBy", "reportedBy",
  "performedBy", "acceptedBy", "createdBy", "checkedBy", "approvedBy", "rejectedBy", "handledBy", "completedBy", "actorId", "entityType",
  "entityId", "movementDate", "plannedDate", "createdAt", "approvedAt", "rejectedAt", "updatedAt", "completedAt", "readAt",
];

function displayValue(row: WorkflowRecord, key: string, value: unknown) {
  const display = row.__display as Record<string, string> | undefined;
  if (display?.[key]) return display[key];
  if (typeof value === "boolean") return value ? "Так" : "Ні";
  if (value == null || value === "") return "—";
  if (key.toLowerCase().includes("date") || ["createdAt", "updatedAt", "completedAt", "approvedAt", "rejectedAt", "readAt"].includes(key)) return formatDateTime(value);
  if (key === "status" || key === "movementType" || key === "action" || key === "severity" || key === "type" || key === "entityType") return label(value, String(value));
  if (String(value).includes(":") || (value && typeof value === "object" && "table" in value)) return recordId(value);
  return String(value);
}

function workflowTitle(row: WorkflowRecord, primary: string) {
  if (row.__title) return String(row.__title);
  const primaryValue = row[primary] ?? row.title ?? row.reason ?? row.action ?? row.body ?? row.movementType ?? "Запис операції";
  return label(primaryValue, "Запис операції");
}

function orderedEntries(row: WorkflowRecord) {
  const keys = Object.keys(row).filter((key) => !hiddenFields.has(key) && !key.startsWith("__"));
  return keys.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left);
    const rightIndex = preferredOrder.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, "uk");
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

function WorkflowDetails({ row }: { row: WorkflowRecord }) {
  return (
    <div className="details-list">
      {orderedEntries(row).map((key) => (
        <div key={key}>
          <span>{fieldLabels[key] ?? key}</span>
          <strong>{displayValue(row, key, row[key])}</strong>
        </div>
      ))}
    </div>
  );
}

export function WorkflowList({ rows, primary = "title", actions }: { rows: WorkflowRecord[]; primary?: string; actions?: (row: WorkflowRecord) => ReactNode }) {
  return (
    <div className="workflow-list">
      {rows.map((row) => {
        const title = workflowTitle(row, primary);
        return (
          <article key={recordId(row.id)}>
            <div className="workflow-row-main">
              <Dialog
                label={title}
                title={title}
                icon={false}
                kicker="ДЕТАЛІ СЛУЖБОВОГО ЗАПИСУ"
                triggerClassName="workflow-row-trigger"
              >
                <WorkflowDetails row={row} />
              </Dialog>
              {row.__subtitle ? <small>{String(row.__subtitle)}</small> : null}
            </div>
            <span className="workflow-row-date">{formatDateTime(row.movementDate ?? row.createdAt)}</span>
            {row.status && <StatusBadge status={String(row.status)} />}
            {actions && <div className="workflow-row-actions">{actions(row)}</div>}
          </article>
        );
      })}
      {rows.length === 0 && <p>Записів поки немає.</p>}
    </div>
  );
}
