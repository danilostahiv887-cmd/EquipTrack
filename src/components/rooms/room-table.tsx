import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { StatusBadge } from "@/components/ui/status-badge";
import { RoomForm } from "@/components/rooms/room-form";
import { recordId } from "@/lib/format";
import { deleteRoomAction } from "@/server/actions/rooms";
import type { Room, Reference } from "@/server/services/catalog";

type References = {
  buildings: Reference[];
  types: Reference[];
  users: Reference[];
};

export function RoomTable({
  rooms,
  references,
  canManage,
}: {
  rooms: Room[];
  references?: References;
  canManage?: boolean;
}) {
  return (
    <div className="ledger-table">
      <div className="ledger-head ledger-head-actions">
        <span>Приміщення</span>
        <span>Поверх</span>
        <span>Місткість</span>
        <span>Стан</span>
        <span>Дії</span>
      </div>
      {rooms.map((room) => {
        const id = recordId(room.id);
        return (
          <div className="ledger-row ledger-row-actions" key={id}>
            <Link
              className="ledger-primary-link"
              href={`/rooms/${encodeURIComponent(id)}`}
            >
              <strong>
                {room.number}
                {room.name ? ` · ${room.name}` : ""}
              </strong>
            </Link>
            <span>{room.floor}</span>
            <span>{room.capacity}</span>
            <StatusBadge status={room.status} />
            <div className="row-actions">
              <Link href={`/rooms/${encodeURIComponent(id)}`}>Відкрити</Link>
              {canManage && references && (
                <>
                  <Dialog
                    label="Редагувати"
                    title="Редагування приміщення"
                    icon={false}
                    triggerClassName="inline-dialog-trigger"
                  >
                    <RoomForm
                      mode="edit"
                      room={room}
                      buildings={references.buildings}
                      types={references.types}
                      users={references.users}
                    />
                  </Dialog>
                  <form action={deleteRoomAction}>
                    <input name="roomId" type="hidden" value={id} />
                    <ConfirmSubmit
                      label="Видалити"
                      title="Видалити приміщення?"
                      description={`Запис приміщення ${room.number} буде прибрано з реєстру.`}
                      confirmLabel="Так, видалити"
                      tone="danger"
                    />
                  </form>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
