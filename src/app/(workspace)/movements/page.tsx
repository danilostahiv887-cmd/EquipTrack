import { getWorkflowPage } from "@/server/services/workflows";
import { getMovementReferences } from "@/server/services/catalog";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { MovementForm } from "@/components/workflows/workflow-form";
import { Pagination } from "@/components/ui/pagination";
import { requirePermission } from "@/lib/auth/guards";
import { Dialog } from "@/components/ui/dialog";
import { label } from "@/lib/format";

const typeOptions = ["received", "transferred", "returned_to_storage", "sent_to_repair", "returned_from_repair", "corrected", "written_off"];

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; type?: string }> }) {
  await requirePermission("movement:manage");
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const [rows, references] = await Promise.all([getWorkflowPage("movements", page, search), getMovementReferences()]);
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">ЖУРНАЛ ВІДПОВІДАЛЬНОСТІ</p>
          <h1>Переміщення</h1>
          <p>Надходження, передачі між приміщеннями, ремонти та списання обладнання.</p>
        </div>
        <Dialog label="Новий рух" title="Нове переміщення обладнання"><MovementForm equipment={references.equipment} rooms={references.rooms}/></Dialog>
      </header>
      <form className="filter-line">
        <input name="q" defaultValue={search.q} placeholder="Обладнання, приміщення, виконавець або причина" />
        <select name="type" defaultValue={search.type ?? ""} aria-label="Фільтр за типом руху">
          <option value="">Усі типи руху</option>
          {typeOptions.map((type) => <option key={type} value={type}>{label(type)}</option>)}
        </select>
        <button type="submit">Шукати</button>
      </form>
      <WorkflowList rows={rows.items} primary="movementType" />
      <Pagination path="/movements" page={rows.page} total={rows.total} pageSize={rows.pageSize} query={{ q: search.q, type: search.type }} />
    </section>
  );
}
