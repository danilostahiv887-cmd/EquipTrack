import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getEquipment } from "@/server/services/catalog";
import { getWorkflowPage } from "@/server/services/workflows";
import { approveWriteoffAction } from "@/server/actions/workflows";
import { WriteoffForm } from "@/components/workflows/workflow-form";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";

export default async function WriteoffsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("writeoff:propose"); const page = Math.max(1, Number((await searchParams).page ?? 1)); const [user, rows, equipment] = await Promise.all([getCurrentUser(), getWorkflowPage("writeoffs", page), getEquipment(1)]);
  return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">КОНТРОЛЬ СПИСАННЯ</p><h1>Списання</h1><p>Контрольований маршрут від пропозиції менеджера до рішення адміністратора.</p></div>{user && can(user, "writeoff:propose") && <details className="action-disclosure"><summary>Подати на списання</summary><WriteoffForm equipment={equipment.items}/></details>}</header><WorkflowList rows={rows.items} primary="reason"/>{user && can(user,"writeoff:approve") && <div className="approval-list">{rows.items.filter((row) => row.status === "proposed").map((row) => <form action={approveWriteoffAction} key={String(row.id)}><input type="hidden" name="requestId" value={String(row.id)}/><button type="submit">Погодити списання</button></form>)}</div>}<Pagination path="/writeoffs" page={rows.page} total={rows.total} pageSize={rows.pageSize}/></section>;
}
