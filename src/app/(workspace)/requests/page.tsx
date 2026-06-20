import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getEquipment, getRooms } from "@/server/services/catalog";
import { getWorkflowPage } from "@/server/services/workflows";
import { TransferRequestForm } from "@/components/workflows/workflow-form";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { completeTransferRequestAction, decideTransferRequestAction } from "@/server/actions/workflows";

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page ?? 1)); const [user, rows, equipment, rooms] = await Promise.all([getCurrentUser(), getWorkflowPage("requests", page), getEquipment(1), getRooms(1)]);
  return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">КОНТРОЛЬ ПЕРЕДАЧ</p><h1>Заявки</h1><p>Запити на переміщення, повернення до складу й уточнення місця розташування.</p></div><details className="action-disclosure"><summary>Нова заявка</summary><TransferRequestForm equipment={equipment.items} rooms={rooms.items}/></details></header><WorkflowList rows={rows.items} primary="reason"/>{user && can(user,"request:manage") && <div className="approval-list">{rows.items.filter((row) => row.status === "submitted" || row.status === "approved").map((row) => <div key={String(row.id)}>{row.status === "submitted" ? <><form action={decideTransferRequestAction}><input type="hidden" name="requestId" value={String(row.id)}/><input type="hidden" name="decision" value="approved"/><button type="submit">Погодити</button></form><form action={decideTransferRequestAction}><input type="hidden" name="requestId" value={String(row.id)}/><input type="hidden" name="decision" value="rejected"/><button type="submit">Відхилити</button></form></> : <form action={completeTransferRequestAction}><input type="hidden" name="requestId" value={String(row.id)}/><button type="submit">Завершити передачу</button></form>}</div>)}</div>}<Pagination path="/requests" page={rows.page} total={rows.total} pageSize={rows.pageSize}/></section>;
}
