import { getEquipment, getRooms } from "@/server/services/catalog";
import { getWorkflowPage } from "@/server/services/workflows";
import { RepairForm } from "@/components/workflows/workflow-form";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Pagination } from "@/components/ui/pagination";

export default async function RepairsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page ?? 1)); const [rows, equipment, rooms] = await Promise.all([getWorkflowPage("repairs", page), getEquipment(1), getRooms(1)]);
  return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">ТЕХНІЧНИЙ СТАН</p><h1>Ремонти</h1><p>Повідомлення про пошкодження, діагностика й повернення обладнання до роботи.</p></div><details className="action-disclosure"><summary>Повідомити про несправність</summary><RepairForm equipment={equipment.items} rooms={rooms.items}/></details></header><WorkflowList rows={rows.items} primary="issueDescription"/><Pagination path="/repairs" page={rows.page} total={rows.total} pageSize={rows.pageSize}/></section>;
}
