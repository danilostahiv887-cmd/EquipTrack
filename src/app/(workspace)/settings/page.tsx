import { ReferenceForm } from "@/components/admin/reference-form";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Dialog } from "@/components/ui/dialog";
import { recordId } from "@/lib/format";
import { requirePermission } from "@/lib/auth/guards";
import { getReferences } from "@/server/services/catalog";
import { deleteReferenceAction } from "@/server/actions/references";

type ReferenceKind = "building" | "room_type" | "category";
type SupplierRow = {
  id: unknown;
  name: string;
  type?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  note?: string;
  equipmentCount?: number;
  instanceCount?: number;
  usageCount?: number;
};

export default async function SettingsPage() {
  await requirePermission("reference:manage");
  const data = await getReferences();
  const blocks: Array<{
    title: string;
    kind: ReferenceKind;
    rows: Array<{ id: unknown; name: string }>;
  }> = [
    { title: "Корпуси", kind: "building", rows: data.buildings },
    { title: "Типи приміщень", kind: "room_type", rows: data.types },
    { title: "Категорії", kind: "category", rows: data.categories },
  ];

  return (
    <section className="module-page">
      <header className="module-heading">
        <div>
          <p className="eyebrow">ДОВІДНИКИ ЗАКЛАДУ</p>
          <h1>Налаштування</h1>
          <p>
            Контроль структури корпусів, типів приміщень, категорій та
            постачальників, які фігурують у картках обладнання.
          </p>
        </div>
      </header>
      <div className="reference-grid">
        {blocks.map((block) => (
          <section key={block.kind}>
            <div className="reference-heading">
              <h2>{block.title}</h2>
              <Dialog
                label="Додати"
                title={`Новий запис: ${block.title.toLowerCase()}`}
                triggerClassName="inline-dialog-trigger"
                icon={false}
              >
                <ReferenceForm kind={block.kind} />
              </Dialog>
            </div>
            {block.rows.map((row) => {
              const id = recordId(row.id);
              return (
                <div className="reference-row" key={id}>
                  <strong>{row.name}</strong>
                  <div className="row-actions">
                    <Dialog
                      label="Редагувати"
                      title={`Редагування: ${row.name}`}
                      triggerClassName="inline-dialog-trigger"
                      icon={false}
                    >
                      <ReferenceForm
                        kind={block.kind}
                        mode="edit"
                        record={row}
                      />
                    </Dialog>
                    <form action={deleteReferenceAction}>
                      <input type="hidden" name="kind" value={block.kind} />
                      <input type="hidden" name="referenceId" value={id} />
                      <ConfirmSubmit
                        label="Видалити"
                        title="Видалити запис довідника?"
                        description={`Запис “${row.name}” буде прибрано з довідника.`}
                        confirmLabel="Так, видалити"
                        tone="danger"
                      />
                    </form>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
        <section className="supplier-reference-panel">
          <div className="reference-heading">
            <div>
              <h2>Постачальники та донори</h2>
              <p>
                Організації й фізичні особи, від яких обладнання надходить на
                баланс або сервісне обслуговування.
              </p>
            </div>
            <Dialog
              label="Додати"
              title="Новий постачальник або донор"
              triggerClassName="inline-dialog-trigger"
              icon={false}
            >
              <ReferenceForm kind="supplier" />
            </Dialog>
          </div>
          <div className="supplier-reference-list">
            {(data.suppliers as SupplierRow[]).map((row) => {
              const id = recordId(row.id);
              const usage = Number(row.usageCount ?? 0);
              return (
                <div className="reference-row supplier-reference-row" key={id}>
                  <div>
                    <strong>{row.name}</strong>
                    <small>
                      {[
                        row.type,
                        row.contactPerson,
                        row.phone,
                        row.email,
                        row.note,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Контактні дані не вказані"}
                    </small>
                  </div>
                  <div className="supplier-usage">
                    <span>
                      Моделей: <b>{row.equipmentCount ?? 0}</b>
                    </span>
                    <span>
                      Екземплярів: <b>{row.instanceCount ?? 0}</b>
                    </span>
                  </div>
                  <div className="row-actions">
                    <Dialog
                      label="Редагувати"
                      title={`Редагування: ${row.name}`}
                      triggerClassName="inline-dialog-trigger"
                      icon={false}
                    >
                      <ReferenceForm kind="supplier" mode="edit" record={row} />
                    </Dialog>
                    {usage === 0 ? (
                      <form action={deleteReferenceAction}>
                        <input type="hidden" name="kind" value="supplier" />
                        <input type="hidden" name="referenceId" value={id} />
                        <ConfirmSubmit
                          label="Видалити"
                          title="Видалити постачальника?"
                          description={`Запис “${row.name}” буде прибрано з довідника постачальників.`}
                          confirmLabel="Так, видалити"
                          tone="danger"
                        />
                      </form>
                    ) : (
                      <button
                        className="inline-disabled"
                        type="button"
                        disabled
                        title="Спочатку від’єднайте постачальника від обладнання."
                      >
                        Є зв’язки
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
