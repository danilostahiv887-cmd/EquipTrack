import { getWorkflowPage } from "@/server/services/workflows";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) { const page = Math.max(1, Number((await searchParams).page ?? 1)); const rows = await getWorkflowPage("notifications", page); return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">РОБОЧІ ПОВІДОМЛЕННЯ</p><h1>Сповіщення</h1><p>Повідомлення про заявки, переміщення, ремонт, аудит і списання.</p></div></header><WorkflowList rows={rows.items}/><Pagination path="/notifications" page={rows.page} total={rows.total} pageSize={rows.pageSize}/></section>; }
