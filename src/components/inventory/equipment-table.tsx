import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { EquipmentForm } from "@/components/inventory/equipment-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { money, recordId } from "@/lib/format";
import { deleteEquipmentAction } from "@/server/actions/equipment";
import type { EquipmentListItem, Reference } from "@/server/services/catalog";

type References = {
  categories: Reference[];
};

export function EquipmentTable({ equipment, references, canManage }: { equipment: EquipmentListItem[]; references?: References; canManage?: boolean }) {
  return (
    <div className="ledger-table equipment-ledger equipment-model-ledger">
      <div className="ledger-head ledger-head-actions">
        <span>Модель / тип</span>
        <span>Кількість</span>
        <span>Розміщення</span>
        <span>Вартість фонду</span>
        <span>Стан</span>
        <span>Дії</span>
      </div>
      {equipment.map((item) => {
        const id = recordId(item.id);
        return (
          <div className="ledger-row ledger-row-actions" key={id}>
            <Link className="ledger-primary-link equipment-label" href={`/equipment/${encodeURIComponent(id)}`}>
              {item.photoFileId ? <img src={`/api/files/${encodeURIComponent(item.photoFileId)}/preview`} alt="" /> : <i>Немає фото</i>}
              <span>
                <strong>{item.name}</strong>
                <small>{[item.manufacturer, item.model, item.inventoryPreview && `інв.: ${item.inventoryPreview}`].filter(Boolean).join(" · ")}</small>
              </span>
            </Link>
            <span className="quantity-pill">{item.instanceCount} од.</span>
            <span className="muted-cell">{item.roomsSummary}</span>
            <span>{money.format(Number(item.totalValue || item.price || 0))}</span>
            <StatusBadge status={item.condition} />
            <div className="row-actions">
              <Link href={`/equipment/${encodeURIComponent(id)}`}>Екземпляри</Link>
              {canManage && references && (
                <>
                  <Dialog label="Редагувати" title="Редагування картки обладнання" icon={false} triggerClassName="inline-dialog-trigger">
                    <EquipmentForm mode="edit" equipment={item} categories={references.categories} />
                  </Dialog>
                  <form action={deleteEquipmentAction}>
                    <input name="equipmentId" type="hidden" value={id} />
                    <ConfirmSubmit label="Видалити" title="Видалити картку обладнання?" description={`Картку ${item.name} буде прибрано з реєстру разом з її екземплярами.`} confirmLabel="Так, видалити" tone="danger" />
                  </form>
                </>
              )}
            </div>
          </div>
        );
      })}
      {equipment.length === 0 && <div className="empty-ledger">За цими фільтрами обладнання не знайдено.</div>}
    </div>
  );
}
