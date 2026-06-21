import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { date, money, recordId } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { EquipmentForm } from "@/components/inventory/equipment-form";
import { EquipmentInstanceForm } from "@/components/inventory/equipment-instance-form";
import { deleteEquipmentAction, deleteEquipmentInstanceAction } from "@/server/actions/equipment";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { FileGallery } from "@/components/files/file-gallery";
import type { WorkflowRecord } from "@/server/services/workflows";
import type { EquipmentInstance, EquipmentModel } from "@/server/services/catalog";

type ReferenceSet = { categories: Array<{ id: unknown; name: string }>; rooms: Array<{ id: unknown; number?: string; name?: string }>; users: Array<{ id: unknown; fullName?: string }> };
type PassportFile = { id: unknown; name?: string; mimeType?: string; size?: number; kind?: string; createdAt?: string };
type Passport = {
  equipment: EquipmentModel;
  instances: EquipmentInstance[];
  filteredInstances: EquipmentInstance[];
  instanceQuery: string;
  movements: WorkflowRecord[];
  repairs: Array<Record<string, unknown>>;
  audits: Array<Record<string, unknown>>;
  files: PassportFile[];
};

function instanceSummary(instances: EquipmentInstance[]) {
  const active = instances.filter((item) => item.status === "active").length;
  const repair = instances.filter((item) => item.status === "in_repair" || item.condition === "needs_repair" || item.condition === "damaged").length;
  const storage = instances.filter((item) => item.status === "in_storage").length;
  const total = instances.reduce((sum, item) => sum + Number(item.price ?? 0), 0);
  return { active, repair, storage, total };
}

export function EquipmentPassport({ data, references, canManage }: { data: Passport; references: ReferenceSet; canManage?: boolean }) {
  const item = data.equipment;
  const id = recordId(item.id);
  const summary = instanceSummary(data.instances);

  return (
    <section className="passport equipment-passport">
      <div className="passport-photo">
        {item.photoFileId ? <img src={`/api/files/${encodeURIComponent(item.photoFileId)}/full`} alt={`Фото: ${item.name}`} /> : <p>Фотографія відсутня</p>}
      </div>
      <div className="passport-title">
        <p className="eyebrow">ІНВЕНТАРНА КАРТКА МОДЕЛІ</p>
        <h1>{item.name}</h1>
        <StatusBadge status={item.condition} />
        <StatusBadge status={item.status} />
        <code>{[item.manufacturer, item.model].filter(Boolean).join(" · ") || "Модель не уточнено"}</code>
        {canManage && (
          <div className="row-actions">
            <Dialog label="Редагувати картку" title="Редагування картки обладнання">
              <EquipmentForm mode="edit" equipment={item} categories={references.categories} rooms={references.rooms} users={references.users} />
            </Dialog>
            <Dialog label="Додати екземпляр" title="Новий фізичний екземпляр" icon={false} triggerClassName="inline-dialog-trigger action-stamp">
              <EquipmentInstanceForm
                equipmentId={id}
                rooms={references.rooms}
                users={references.users}
                defaultPrice={item.price}
                defaultAcquisitionDate={item.acquisitionDate}
              />
            </Dialog>
            <form action={deleteEquipmentAction}>
              <input type="hidden" name="equipmentId" value={id} />
              <ConfirmSubmit label="Видалити картку" title="Видалити картку обладнання?" description={`Картку ${item.name} буде прибрано разом з її екземплярами.`} confirmLabel="Так, видалити" tone="danger" />
            </form>
          </div>
        )}
      </div>

      <div className="technical-strip">
        <span>Екземплярів <b>{data.instances.length}</b></span>
        <span>Активних <b>{summary.active}</b></span>
        <span>Потребують уваги <b>{summary.repair}</b></span>
        <span>Балансова вартість <b>{money.format(summary.total || Number(item.price ?? 0))}</b></span>
      </div>

      <section className="instance-section">
        <div className="section-toolbar">
          <div>
            <h2>Екземпляри з серійними номерами</h2>
            <p>Кожна фізична одиниця має власний серійний номер, інвентарний номер, приміщення та відповідальну особу.</p>
          </div>
          <form className="filter-line compact-filter">
            <input name="instances" defaultValue={data.instanceQuery} placeholder="Пошук: серійний, інвентарний, приміщення, відповідальний" />
            <button type="submit">Шукати</button>
          </form>
        </div>
        <div className="instance-list">
          {data.filteredInstances.map((instance) => {
            const instanceId = recordId(instance.id);
            return (
              <article className="instance-card" key={instanceId}>
                <div>
                  <strong>{instance.inventoryNumber}</strong>
                  <span>Серійний: {instance.serialNumber}</span>
                </div>
                <div>
                  <b>{instance.roomLabel || "Приміщення не вказано"}</b>
                  <span>{instance.responsibleLabel || "Відповідальна особа не вказана"}</span>
                </div>
                <div className="instance-statuses">
                  <StatusBadge status={instance.condition} />
                  <StatusBadge status={instance.status} />
                </div>
                <div className="row-actions">
                  {instance.currentRoomId && <Link href={`/rooms/${encodeURIComponent(recordId(instance.currentRoomId))}`}>Приміщення</Link>}
                  {canManage && (
                    <>
                      <Dialog label="Редагувати" title={`Екземпляр ${instance.inventoryNumber}`} icon={false} triggerClassName="inline-dialog-trigger">
                        <EquipmentInstanceForm
                          mode="edit"
                          equipmentId={id}
                          instance={instance}
                          rooms={references.rooms}
                          users={references.users}
                          defaultPrice={item.price}
                          defaultAcquisitionDate={item.acquisitionDate}
                        />
                      </Dialog>
                      <form action={deleteEquipmentInstanceAction}>
                        <input type="hidden" name="equipmentId" value={id} />
                        <input type="hidden" name="instanceId" value={instanceId} />
                        <ConfirmSubmit label="Видалити" title="Видалити екземпляр?" description={`Екземпляр ${instance.inventoryNumber} буде прибрано з картки.`} confirmLabel="Так, видалити" tone="danger" />
                      </form>
                    </>
                  )}
                </div>
              </article>
            );
          })}
          {data.filteredInstances.length === 0 && <p className="empty-ledger">Екземпляри за цим пошуком не знайдені.</p>}
        </div>
      </section>

      <section>
        <h2>Ланцюг відповідальності</h2>
        <WorkflowList rows={data.movements} primary="movementType" />
      </section>

      <section>
        <h2>Галерея та вкладення картки</h2>
        <FileGallery files={data.files} canManage={canManage} returnPath={`/equipment/${encodeURIComponent(id)}`} />
      </section>

      <section>
        <h2>Дані надходження</h2>
        <div className="compact-list">
          <div><strong>Типова дата</strong><span>{item.acquisitionDate ? date.format(new Date(item.acquisitionDate)) : "—"}</span><StatusBadge status={item.status} /></div>
          <div><strong>Типова ціна одиниці</strong><span>{money.format(Number(item.price ?? 0))}</span><StatusBadge status={item.condition} /></div>
        </div>
      </section>
    </section>
  );
}
