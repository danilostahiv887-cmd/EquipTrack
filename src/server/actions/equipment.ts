"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { normalizeRecordIdString, toRecordId } from "@/lib/db/record-id";
import { prepareUpload } from "@/lib/files/service";
import {
  equipmentInstanceSchema,
  equipmentInstanceUpdateSchema,
  equipmentSchema,
} from "@/lib/validation/equipment";
import { queryRows } from "@/lib/db/repository";
import {
  equipmentSnapshotLabel,
  resolveEquipmentModelName,
  resolveEquipmentSnapshot,
} from "@/server/services/equipment-snapshot";

export type EquipmentActionState = {
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
  success?: string;
};

const generatedId = () => randomUUID().replaceAll("-", "");
const formValues = (formData: FormData) =>
  Object.fromEntries(
    [...formData.entries()].filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
const validationErrors = (
  error: {
    flatten: () => { fieldErrors: Record<string, string[] | undefined> };
  },
  formData: FormData,
) => ({
  fieldErrors: Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([key, value]) => [
      key,
      value?.length ? value : ["Некоректне значення."],
    ]),
  ),
  values: formValues(formData),
});

async function ensureEquipmentManager(formData?: FormData) {
  const user = await getCurrentUser();
  if (!user)
    return {
      error: {
        formError: "Сеанс завершено. Увійдіть повторно.",
        ...(formData ? { values: formValues(formData) } : {}),
      } as EquipmentActionState,
    };
  try {
    assertPermission(user, "equipment:manage");
    return { user };
  } catch (error) {
    return {
      error: {
        formError:
          error instanceof Error ? error.message : "Доступ заборонено.",
        ...(formData ? { values: formValues(formData) } : {}),
      } as EquipmentActionState,
    };
  }
}

async function prepareOptionalUpload(formData: FormData): Promise<{
  prepared?: Awaited<ReturnType<typeof prepareUpload>>;
  error?: EquipmentActionState;
}> {
  const upload = formData.get("photo");
  try {
    if (upload && typeof upload !== "string" && upload.size > 0)
      return { prepared: await prepareUpload(upload) };
  } catch (error) {
    return {
      error: {
        formError:
          error instanceof Error ? error.message : "Не вдалося обробити файл.",
        values: formValues(formData),
      },
    };
  }
  return {};
}

export async function createEquipmentAction(
  _: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const auth = await ensureEquipmentManager(formData);
  if (auth.error) return auth.error;
  const parsed = equipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrors(parsed.error, formData);
  const upload = await prepareOptionalUpload(formData);
  if (upload.error) return upload.error;

  const id = generatedId();
  const fileId = upload.prepared ? generatedId() : undefined;
  const logId = generatedId();
  const timestamp = new Date().toISOString();
  const equipmentId = `equipment:${id}`;
  const equipment = {
    ...parsed.data,
    photoFileId: fileId ? `file:${fileId}` : undefined,
    status: "active",
    createdBy: auth.user.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    await withDatabase(async (db) => {
      const statements = [
        "BEGIN TRANSACTION;",
        `CREATE equipment:${id} CONTENT $equipment;`,
        ...(upload.prepared && fileId
          ? [`CREATE file:${fileId} CONTENT $file;`]
          : []),
        `CREATE audit_log:${logId} CONTENT $log;`,
        "COMMIT TRANSACTION;",
      ];
      await db.query(statements.join(" "), {
        equipment,
        file:
          upload.prepared && fileId
            ? {
                ...upload.prepared,
                entityType: "equipment",
                entityId: equipmentId,
                uploadedBy: auth.user.id,
                createdAt: timestamp,
              }
            : null,
        log: {
          actorId: auth.user.id,
          action: "equipment.created",
          entityType: "equipment",
          entityId: equipmentId,
          createdAt: timestamp,
        },
      });
    });
  } catch {
    return {
      formError: "Не вдалося створити картку обладнання.",
      values: formValues(formData),
    };
  }

  revalidatePath("/equipment");
  revalidatePath("/dashboard");
  return {
    success:
      "Картку обладнання створено. Тепер додайте фізичні екземпляри з серійними номерами.",
  };
}

export async function updateEquipmentAction(
  _: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const auth = await ensureEquipmentManager(formData);
  if (auth.error) return auth.error;
  const equipmentId = String(formData.get("equipmentId") ?? "");
  if (!equipmentId)
    return {
      formError: "Не вказано обладнання для редагування.",
      values: formValues(formData),
    };
  const parsed = equipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrors(parsed.error, formData);
  const upload = await prepareOptionalUpload(formData);
  if (upload.error) return upload.error;

  const timestamp = new Date().toISOString();
  const fileId = upload.prepared ? generatedId() : undefined;
  const logId = generatedId();
  const record = toRecordId(equipmentId);
  const textId = normalizeRecordIdString(equipmentId);
  const value = {
    ...parsed.data,
    ...(fileId ? { photoFileId: `file:${fileId}` } : {}),
    updatedAt: timestamp,
  };

  try {
    await withDatabase(async (db) => {
      const statements = [
        "BEGIN TRANSACTION;",
        "UPDATE $equipmentId MERGE $value;",
        ...(upload.prepared && fileId
          ? [`CREATE file:${fileId} CONTENT $file;`]
          : []),
        `CREATE audit_log:${logId} CONTENT $log;`,
        "COMMIT TRANSACTION;",
      ];
      await db.query(statements.join(" "), {
        equipmentId: record,
        value,
        file:
          upload.prepared && fileId
            ? {
                ...upload.prepared,
                entityType: "equipment",
                entityId: textId,
                uploadedBy: auth.user.id,
                createdAt: timestamp,
              }
            : null,
        log: {
          actorId: auth.user.id,
          action: "equipment.updated",
          entityType: "equipment",
          entityId: textId,
          createdAt: timestamp,
        },
      });
    });
  } catch {
    return {
      formError: "Не вдалося оновити картку обладнання.",
      values: formValues(formData),
    };
  }

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${encodeURIComponent(textId)}`);
  revalidatePath("/dashboard");
  return { success: "Картку обладнання оновлено." };
}

export async function createEquipmentInstanceAction(
  _: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const auth = await ensureEquipmentManager(formData);
  if (auth.error) return auth.error;
  const parsed = equipmentInstanceSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationErrors(parsed.error, formData);

  const id = generatedId();
  const movementId = generatedId();
  const logId = generatedId();
  const timestamp = new Date().toISOString();
  const instanceId = `equipment_instance:${id}`;
  const instance = {
    equipmentId: parsed.data.equipmentId,
    inventoryNumber: parsed.data.inventoryNumber,
    serialNumber: parsed.data.serialNumber,
    currentRoomId: parsed.data.roomId,
    currentResponsibleId: parsed.data.responsibleId,
    supplierId: parsed.data.supplierId,
    status: parsed.data.status,
    condition: parsed.data.condition,
    price: parsed.data.price,
    acquisitionDate: parsed.data.acquisitionDate,
    createdBy: auth.user.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    await withDatabase(async (db) => {
      const equipmentName = await resolveEquipmentModelName(
        db,
        parsed.data.equipmentId,
      );
      if (!equipmentName) throw new Error("Картку обладнання не знайдено.");
      const equipmentSnapshot = equipmentSnapshotLabel({
        name: equipmentName,
        inventoryNumber: parsed.data.inventoryNumber,
        serialNumber: parsed.data.serialNumber,
      });
      await db.query(
        `BEGIN TRANSACTION;
        CREATE equipment_instance:${id} CONTENT $instance;
        CREATE movement:${movementId} CONTENT $movement;
        CREATE audit_log:${logId} CONTENT $log;
        COMMIT TRANSACTION;`,
        {
          instance,
          movement: {
            equipmentId: instanceId,
            equipmentSnapshot,
            movementType: "received",
            toRoomId: parsed.data.roomId,
            toResponsibleId: parsed.data.responsibleId,
            performedBy: auth.user.id,
            acceptedBy: parsed.data.responsibleId,
            movementDate: timestamp,
            reason: "Первинне надходження екземпляра",
            createdAt: timestamp,
          },
          log: {
            actorId: auth.user.id,
            action: "equipment_instance.created",
            entityType: "equipment_instance",
            entityId: instanceId,
            entitySnapshot: equipmentSnapshot,
            createdAt: timestamp,
          },
        },
      );
    });
  } catch (error) {
    const message =
      error instanceof Error && /unique/i.test(error.message)
        ? "Інвентарний або серійний номер уже використовується."
        : "Не вдалося додати екземпляр обладнання.";
    return { formError: message, values: formValues(formData) };
  }

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${encodeURIComponent(parsed.data.equipmentId)}`);
  revalidatePath("/rooms");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
  return { success: "Екземпляр додано до картки обладнання." };
}

export async function updateEquipmentInstanceAction(
  _: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const auth = await ensureEquipmentManager(formData);
  if (auth.error) return auth.error;
  const parsed = equipmentInstanceUpdateSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationErrors(parsed.error, formData);

  const timestamp = new Date().toISOString();
  const instanceText = normalizeRecordIdString(parsed.data.instanceId);
  const instanceRecord = toRecordId(instanceText);

  try {
    await withDatabase(async (db) => {
      const [current] = await queryRows<{
        currentRoomId?: string;
        currentResponsibleId?: string;
        equipmentId?: string;
      }>(
        db,
        "SELECT currentRoomId, currentResponsibleId, equipmentId FROM equipment_instance WHERE id = $id LIMIT 1;",
        { id: instanceRecord },
      );
      if (!current) throw new Error("Екземпляр не знайдено.");
      const equipmentName = await resolveEquipmentModelName(
        db,
        current.equipmentId ?? parsed.data.equipmentId,
      );
      const equipmentSnapshot = equipmentSnapshotLabel({
        name: equipmentName,
        inventoryNumber: parsed.data.inventoryNumber,
        serialNumber: parsed.data.serialNumber,
      });
      const fromRoomId = normalizeRecordIdString(current.currentRoomId ?? "");
      const toRoomId = parsed.data.roomId;
      const movementId =
        fromRoomId && fromRoomId !== toRoomId
          ? `movement:${generatedId()}`
          : "";
      const logId = `audit_log:${generatedId()}`;
      const value = {
        inventoryNumber: parsed.data.inventoryNumber,
        serialNumber: parsed.data.serialNumber,
        currentRoomId: parsed.data.roomId,
        currentResponsibleId: parsed.data.responsibleId,
        supplierId: parsed.data.supplierId,
        status: parsed.data.status,
        condition: parsed.data.condition,
        price: parsed.data.price,
        acquisitionDate: parsed.data.acquisitionDate,
        updatedAt: timestamp,
      };
      const statements = [
        "BEGIN TRANSACTION;",
        "UPDATE $instanceId MERGE $value;",
        ...(movementId ? [`CREATE ${movementId} CONTENT $movement;`] : []),
        `CREATE ${logId} CONTENT $log;`,
        "COMMIT TRANSACTION;",
      ];
      await db.query(statements.join(" "), {
        instanceId: instanceRecord,
        value,
        movement: movementId
          ? {
              equipmentId: instanceText,
              equipmentSnapshot,
              movementType: "corrected",
              fromRoomId,
              toRoomId,
              performedBy: auth.user.id,
              acceptedBy: parsed.data.responsibleId,
              movementDate: timestamp,
              reason: "Оновлено місце або відповідальну особу екземпляра",
              createdAt: timestamp,
            }
          : null,
        log: {
          actorId: auth.user.id,
          action: "equipment_instance.updated",
          entityType: "equipment_instance",
          entityId: instanceText,
          entitySnapshot: equipmentSnapshot,
          createdAt: timestamp,
        },
      });
    });
  } catch (error) {
    const message =
      error instanceof Error && /unique/i.test(error.message)
        ? "Інвентарний або серійний номер уже використовується."
        : error instanceof Error
          ? error.message
          : "Не вдалося оновити екземпляр.";
    return { formError: message, values: formValues(formData) };
  }

  revalidatePath("/equipment");
  revalidatePath(`/equipment/${encodeURIComponent(parsed.data.equipmentId)}`);
  revalidatePath("/rooms");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
  return { success: "Екземпляр оновлено." };
}

export async function deleteEquipmentInstanceAction(formData: FormData) {
  const auth = await ensureEquipmentManager();
  if (auth.error || !auth.user) return;
  const instanceId = String(formData.get("instanceId") ?? "");
  const equipmentId = String(formData.get("equipmentId") ?? "");
  if (!instanceId) throw new Error("Не вказано екземпляр для видалення.");
  const timestamp = new Date().toISOString();
  const instanceText = normalizeRecordIdString(instanceId);
  await withDatabase(async (db) => {
    const equipmentSnapshot = await resolveEquipmentSnapshot(db, instanceText);
    await db.query(
      `BEGIN TRANSACTION;
      UPDATE movement SET equipmentSnapshot = $snapshot WHERE equipmentId = $instance;
      UPDATE transfer_request SET equipmentSnapshot = $snapshot WHERE equipmentId = $instance;
      UPDATE repair SET equipmentSnapshot = $snapshot WHERE equipmentId = $instance;
      UPDATE writeoff_request SET equipmentSnapshot = $snapshot WHERE equipmentId = $instance;
      UPDATE audit_log SET entitySnapshot = $snapshot WHERE entityType = 'equipment_instance' AND entityId = $instance;
      DELETE $id;
      CREATE audit_log CONTENT $log;
      COMMIT TRANSACTION;`,
      {
        id: toRecordId(instanceText),
        instance: instanceText,
        snapshot: equipmentSnapshot || undefined,
        log: {
          actorId: auth.user.id,
          action: "equipment_instance.deleted",
          entityType: "equipment_instance",
          entityId: instanceText,
          entitySnapshot: equipmentSnapshot || undefined,
          createdAt: timestamp,
        },
      },
    );
  });
  revalidatePath("/equipment");
  if (equipmentId)
    revalidatePath(`/equipment/${encodeURIComponent(equipmentId)}`);
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
}

export async function deleteEquipmentAction(formData: FormData) {
  const auth = await ensureEquipmentManager();
  if (auth.error || !auth.user) return;
  const equipmentId = String(formData.get("equipmentId") ?? "");
  if (!equipmentId) throw new Error("Не вказано обладнання для видалення.");
  const id = toRecordId(equipmentId);
  const textId = normalizeRecordIdString(equipmentId);
  const timestamp = new Date().toISOString();
  await withDatabase((db) =>
    db.query(
      "BEGIN TRANSACTION; DELETE equipment_instance WHERE equipmentId = $textId; DELETE $id; DELETE file WHERE entityId = $textId; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
      {
        id,
        textId,
        log: {
          actorId: auth.user.id,
          action: "equipment.deleted",
          entityType: "equipment",
          entityId: textId,
          createdAt: timestamp,
        },
      },
    ),
  );
  revalidatePath("/equipment");
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  redirect("/equipment");
}
