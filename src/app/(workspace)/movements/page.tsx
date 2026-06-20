import { getWorkflowPage } from "@/server/services/workflows";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) { await requirePermission("movement:manage"); const page = Math.max(1, Number((await searchParams).page ?? 1)); const rows = await getWorkflowPage("movements", page); return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">ЖУРНАЛ ВІДПОВІДАЛЬНОСТІ</p><h1>Переміщення</h1><p>Незмінна історія надходжень, передач, ремонту й списання.</p></div></header><WorkflowList rows={rows.items} primary="movementType"/><Pagination path="/movements" page={rows.page} total={rows.total} pageSize={rows.pageSize}/></section>; }
