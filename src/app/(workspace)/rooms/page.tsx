import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Pagination } from "@/components/ui/pagination";
import { RoomForm } from "@/components/rooms/room-form";
import { RoomTable } from "@/components/rooms/room-table";
import { Dialog } from "@/components/ui/dialog";
import { getReferences, getRooms } from "@/server/services/catalog";

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const search = await searchParams; const page = Math.max(1, Number(search.page ?? 1));
  const [user, result, references] = await Promise.all([getCurrentUser(), getRooms(page, search.q), getReferences()]);
  return <section className="module-page"><header className="module-heading"><div><p className="eyebrow">СТРУКТУРА ЗАКЛАДУ</p><h1>Приміщення</h1><p>Паспорти аудиторій, лабораторій, складів і технічних зон.</p></div>{user && can(user, "room:manage") && <Dialog label="Додати приміщення" title="Нове приміщення"><RoomForm buildings={references.buildings} types={references.types} users={references.users} /></Dialog>}</header><form className="filter-line"><input name="q" defaultValue={search.q} placeholder="Номер або назва приміщення"/><button type="submit">Шукати</button></form><RoomTable rooms={result.items}/><Pagination path="/rooms" page={result.page} total={result.total} pageSize={result.pageSize} query={{ q: search.q }}/></section>;
}
