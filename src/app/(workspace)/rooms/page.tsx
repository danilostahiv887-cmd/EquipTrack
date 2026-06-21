import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Pagination } from "@/components/ui/pagination";
import { RoomForm } from "@/components/rooms/room-form";
import { RoomTable } from "@/components/rooms/room-table";
import { Dialog } from "@/components/ui/dialog";
import { getReferences, getRooms } from "@/server/services/catalog";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    buildingId?: string;
    typeId?: string;
  }>;
}) {
  const search = await searchParams;
  const page = Math.max(1, Number(search.page ?? 1));
  const [user, result, references] = await Promise.all([
    getCurrentUser(),
    getRooms(page, search),
    getReferences(),
  ]);
  const canManage = Boolean(user && can(user, "room:manage"));
  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">СТРУКТУРА ЗАКЛАДУ</p>
          <h1>Приміщення</h1>
          <p>Паспорти аудиторій, лабораторій, складів і технічних зон.</p>
        </div>
        {canManage && (
          <Dialog label="Додати приміщення" title="Нове приміщення">
            <RoomForm
              buildings={references.buildings}
              types={references.types}
              users={references.users}
            />
          </Dialog>
        )}
      </header>
      <form className="filter-line">
        <input
          name="q"
          defaultValue={search.q}
          placeholder="Номер або назва приміщення"
        />
        <select name="buildingId" defaultValue={search.buildingId ?? ""}>
          <option value="">Усі корпуси</option>
          {references.buildings.map((item) => (
            <option
              key={String(item.id)}
              value={String(item.id).replace(/^([^:]+):⟨(.+)⟩$/, "$1:$2")}
            >
              {item.name}
            </option>
          ))}
        </select>
        <select name="typeId" defaultValue={search.typeId ?? ""}>
          <option value="">Усі типи</option>
          {references.types.map((item) => (
            <option
              key={String(item.id)}
              value={String(item.id).replace(/^([^:]+):⟨(.+)⟩$/, "$1:$2")}
            >
              {item.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={search.status ?? ""}>
          <option value="">Будь-який стан</option>
          <option value="active">Активне</option>
          <option value="inactive">Неактивне</option>
          <option value="under_repair">У ремонті</option>
        </select>
        <button type="submit">Шукати</button>
      </form>
      <RoomTable
        rooms={result.items}
        references={references}
        canManage={canManage}
      />
      <Pagination
        path="/rooms"
        page={result.page}
        total={result.total}
        pageSize={result.pageSize}
        query={{
          q: search.q,
          status: search.status,
          buildingId: search.buildingId,
          typeId: search.typeId,
        }}
      />
    </section>
  );
}
