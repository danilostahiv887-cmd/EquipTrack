import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Pagination } from "@/components/ui/pagination";
import { EquipmentForm } from "@/components/inventory/equipment-form";
import { EquipmentTable } from "@/components/inventory/equipment-table";
import { getEquipment, getReferences, getRooms } from "@/server/services/catalog";

export default async function EquipmentPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const search = await searchParams; const page = Math.max(1, Number(search.page ?? 1));
  const [user, result, references, rooms] = await Promise.all([getCurrentUser(), getEquipment(page, search.q), getReferences(), getRooms(1)]);
  return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">ОСНОВНИЙ РЕЄСТР</p><h1>Обладнання</h1><p>Пошук за назвою, інвентарним або серійним номером.</p></div>{user && can(user, "equipment:manage") && <details className="action-disclosure"><summary>Зареєструвати обладнання</summary><EquipmentForm categories={references.categories} rooms={rooms.items} users={references.users}/></details>}</header><form className="filter-line"><input name="q" defaultValue={search.q} placeholder="Назва, інвентарний або серійний номер"/><button type="submit">Шукати</button></form><EquipmentTable equipment={result.items}/><Pagination path="/equipment" page={result.page} total={result.total} pageSize={result.pageSize} query={{ q: search.q }}/></section>;
}
