import { ReferenceForm } from "@/components/admin/reference-form";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Dialog } from "@/components/ui/dialog";
import { recordId } from "@/lib/format";
import { requirePermission } from "@/lib/auth/guards";
import { getReferences } from "@/server/services/catalog";
import { deleteReferenceAction } from "@/server/actions/references";

type ReferenceKind = "building" | "room_type" | "category";

export default async function SettingsPage() {
  await requirePermission("reference:manage");
  const data = await getReferences();
  const blocks: Array<{ title: string; kind: ReferenceKind; rows: Array<{ id: unknown; name: string }> }> = [
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
          <p>Контроль структури корпусів, типів приміщень, категорій та відповідальних осіб.</p>
        </div>
      </header>
      <div className="reference-grid">
        {blocks.map((block) => (
          <section key={block.kind}>
            <div className="reference-heading">
              <h2>{block.title}</h2>
              <Dialog label="Додати" title={`Новий запис: ${block.title.toLowerCase()}`} triggerClassName="inline-dialog-trigger" icon={false}>
                <ReferenceForm kind={block.kind} />
              </Dialog>
            </div>
            {block.rows.map((row) => {
              const id = recordId(row.id);
              return (
                <div className="reference-row" key={id}>
                  <strong>{row.name}</strong>
                  <div className="row-actions">
                    <Dialog label="Редагувати" title={`Редагування: ${row.name}`} triggerClassName="inline-dialog-trigger" icon={false}>
                      <ReferenceForm kind={block.kind} mode="edit" record={row} />
                    </Dialog>
                    <form action={deleteReferenceAction}>
                      <input type="hidden" name="kind" value={block.kind} />
                      <input type="hidden" name="referenceId" value={id} />
                      <ConfirmSubmit label="Видалити" title="Видалити запис довідника?" description={`Запис “${row.name}” буде прибрано з довідника.`} confirmLabel="Так, видалити" tone="danger" />
                    </form>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </section>
  );
}
