import { getWorkflowPage } from "@/server/services/workflows";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) { await requirePermission("user:manage"); const page = Math.max(1, Number((await searchParams).page ?? 1)); const rows = await getWorkflowPage("auditLog", page); return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">НЕЗМІННА ІСТОРІЯ</p><h1>Журнал дій</h1><p>Хто і коли створював, змінював або погоджував записи у системі.</p></div></header><WorkflowList rows={rows.items} primary="action"/><Pagination path="/audit-log" page={rows.page} total={rows.total} pageSize={rows.pageSize}/></section>; }
