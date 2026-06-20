import { getRooms } from "@/server/services/catalog";
import { getWorkflowPage } from "@/server/services/workflows";
import { AuditForm } from "@/components/workflows/workflow-form";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";

export default async function AuditsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePermission("audit:manage"); const page = Math.max(1, Number((await searchParams).page ?? 1)); const [rows, rooms] = await Promise.all([getWorkflowPage("audits", page), getRooms(1)]);
  return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">ІНВЕНТАРИЗАЦІЯ</p><h1>Аудити</h1><p>Перевірка очікуваного обладнання, фактичного місця й технічного стану.</p></div><details className="action-disclosure"><summary>Створити аудит</summary><AuditForm rooms={rooms.items}/></details></header><WorkflowList rows={rows.items}/><Pagination path="/audits" page={rows.page} total={rows.total} pageSize={rows.pageSize}/></section>;
}
