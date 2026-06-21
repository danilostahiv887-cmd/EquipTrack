import { StatusBadge } from "@/components/ui/status-badge";
import { money, recordId } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { RoomForm } from "@/components/rooms/room-form";
import { deleteRoomAction } from "@/server/actions/rooms";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { FileGallery } from "@/components/files/file-gallery";
import type { WorkflowRecord } from "@/server/services/workflows";

type ReferenceSet = {
  buildings: Array<{ id: unknown; name: string }>;
  types: Array<{ id: unknown; name: string }>;
  users: Array<{ id: unknown; fullName?: string }>;
};
type PassportFile = {
  id: unknown;
  name?: string;
  mimeType?: string;
  size?: number;
  kind?: string;
  createdAt?: string;
};
type Passport = {
  room: {
    id?: unknown;
    number: string;
    name?: string;
    buildingId?: string;
    roomTypeId?: string;
    responsibleId?: string;
    floor: number;
    capacity: number;
    status: string;
    description?: string;
  };
  equipment: Array<{
    id: unknown;
    equipmentId?: string;
    equipmentName?: string;
    inventoryNumber: string;
    serialNumber?: string;
    condition: string;
    price?: number;
  }>;
  movements: WorkflowRecord[];
  audits: Array<Record<string, unknown>>;
  files: PassportFile[];
};
export function RoomPassport({
  data,
  references,
  canManage,
}: {
  data: Passport;
  references: ReferenceSet;
  canManage?: boolean;
}) {
  const total = data.equipment.reduce(
    (sum, item) => sum + Number(item.price ?? 0),
    0,
  );
  const id = recordId(data.room.id);
  return (
    <section className="passport">
      <div className="passport-title">
        <p className="eyebrow">ПАСПОРТ ПРИМІЩЕННЯ</p>
        <h1>
          {data.room.number}
          {data.room.name ? ` · ${data.room.name}` : ""}
        </h1>
        <StatusBadge status={data.room.status} />
        {canManage && (
          <div className="row-actions">
            <Dialog label="Редагувати паспорт" title="Редагування приміщення">
              <RoomForm
                mode="edit"
                room={data.room}
                buildings={references.buildings}
                types={references.types}
                users={references.users}
              />
            </Dialog>
            <form action={deleteRoomAction}>
              <input type="hidden" name="roomId" value={id} />
              <ConfirmSubmit
                label="Видалити"
                title="Видалити приміщення?"
                description={`Запис приміщення ${data.room.number} буде прибрано з реєстру.`}
                confirmLabel="Так, видалити"
                tone="danger"
              />
            </form>
          </div>
        )}
      </div>
      <div className="technical-strip">
        <span>
          Поверх <b>{data.room.floor}</b>
        </span>
        <span>
          Місткість <b>{data.room.capacity}</b>
        </span>
        <span>
          Екземплярів <b>{data.equipment.length}</b>
        </span>
        <span>
          Вартість <b>{money.format(total)}</b>
        </span>
      </div>
      {data.room.description && (
        <section>
          <h2>Опис</h2>
          <p className="passport-note">{data.room.description}</p>
        </section>
      )}
      <section>
        <h2>Обладнання у приміщенні</h2>
        <div className="compact-list">
          {data.equipment.map((item) => (
            <div key={recordId(item.id)}>
              <strong>{item.equipmentName ?? "Обладнання"}</strong>
              <span>
                {item.inventoryNumber}
                {item.serialNumber ? ` · ${item.serialNumber}` : ""}
              </span>
              <StatusBadge status={item.condition} />
            </div>
          ))}
          {data.equipment.length === 0 && <p>Обладнання ще не призначено.</p>}
        </div>
      </section>
      <section>
        <h2>Останні переміщення</h2>
        <WorkflowList rows={data.movements} primary="movementType" />
      </section>
      <section>
        <h2>Галерея та вкладення</h2>
        <FileGallery
          files={data.files}
          canManage={canManage}
          returnPath={`/rooms/${encodeURIComponent(id)}`}
        />
      </section>
    </section>
  );
}
