import type { Surreal } from "surrealdb";
import { normalizeRecordIdString, toRecordId } from "@/lib/db/record-id";
import { queryRows } from "@/lib/db/repository";

type EquipmentSnapshotSource = {
  equipmentId?: unknown;
  inventoryNumber?: unknown;
  serialNumber?: unknown;
  name?: unknown;
};

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

export function equipmentSnapshotLabel(source: EquipmentSnapshotSource) {
  return [
    text(source.name),
    text(source.inventoryNumber),
    text(source.serialNumber),
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function resolveEquipmentModelName(
  db: Surreal,
  equipmentId: unknown,
) {
  const normalized = normalizeRecordIdString(equipmentId ?? "");
  if (!normalized) return "";
  const [model] = await queryRows<{ name?: string }>(
    db,
    "SELECT name FROM equipment WHERE id = $id LIMIT 1;",
    { id: toRecordId(normalized) },
  );
  return text(model?.name);
}

export async function resolveEquipmentSnapshot(
  db: Surreal,
  instanceId: unknown,
  knownInstance?: EquipmentSnapshotSource,
) {
  const normalized = normalizeRecordIdString(instanceId ?? "");
  if (!normalized) return "";
  const instance =
    knownInstance ??
    (
      await queryRows<EquipmentSnapshotSource>(
        db,
        "SELECT equipmentId, inventoryNumber, serialNumber FROM equipment_instance WHERE id = $id LIMIT 1;",
        { id: toRecordId(normalized) },
      )
    )[0];
  if (!instance) return "";
  const name = await resolveEquipmentModelName(db, instance.equipmentId);
  return equipmentSnapshotLabel({
    name,
    inventoryNumber: instance.inventoryNumber,
    serialNumber: instance.serialNumber,
  });
}
