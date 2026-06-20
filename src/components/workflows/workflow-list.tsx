import { StatusBadge } from "@/components/ui/status-badge";
import { recordId } from "@/lib/format";
import type { WorkflowRecord } from "@/server/services/workflows";

export function WorkflowList({ rows, primary = "title" }: { rows: WorkflowRecord[]; primary?: string }) {
  return <div className="workflow-list">{rows.map((row) => <article key={recordId(row.id)}><div><strong>{String(row[primary] ?? row.reason ?? row.action ?? "Запис операції")}</strong><span>{String(row.createdAt ?? row.movementDate ?? "")}</span></div>{row.status && <StatusBadge status={String(row.status)} />}</article>)}{rows.length === 0 && <p>Записів поки немає.</p>}</div>;
}
