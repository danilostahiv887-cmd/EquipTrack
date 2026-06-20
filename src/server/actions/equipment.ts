"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { prepareUpload } from "@/lib/files/service";
import { equipmentSchema } from "@/lib/validation/equipment";

export type EquipmentActionState = { formError?: string; fieldErrors?: Record<string, string> };
const generatedId = () => randomUUID().replaceAll("-", "");

export async function createEquipmentAction(_: EquipmentActionState, formData: FormData): Promise<EquipmentActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено. Увійдіть повторно." };
  try { assertPermission(user, "equipment:manage"); } catch (error) { return { formError: error instanceof Error ? error.message : "Доступ заборонено." }; }
  const parsed = equipmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Некоректне значення."])) };
  const upload = formData.get("photo");
  let prepared: Awaited<ReturnType<typeof prepareUpload>> | undefined;
  try { if (upload && typeof upload !== "string" && upload.size > 0) prepared = await prepareUpload(upload); } catch (error) { return { formError: error instanceof Error ? error.message : "Не вдалося обробити файл." }; }
  const id = generatedId(); const fileId = prepared ? generatedId() : undefined; const movementId = generatedId(); const logId = generatedId(); const timestamp = new Date().toISOString();
  const equipmentId = `equipment:${id}`;
  const equipment = { ...parsed.data, currentRoomId: parsed.data.roomId, currentResponsibleId: parsed.data.responsibleId, photoFileId: fileId ? `file:${fileId}` : undefined, status: "active", createdBy: user.id, createdAt: timestamp, updatedAt: timestamp };
  const movement = { equipmentId, movementType: "received", toRoomId: parsed.data.roomId, toResponsibleId: parsed.data.responsibleId, performedBy: user.id, acceptedBy: parsed.data.responsibleId, movementDate: timestamp, reason: "Первинне надходження", createdAt: timestamp };
  try {
    await withDatabase(async (db) => {
      const statements = ["BEGIN TRANSACTION;", `CREATE equipment:${id} CONTENT $equipment;`, ...(prepared && fileId ? [`CREATE file:${fileId} CONTENT $file;`] : []), `CREATE movement:${movementId} CONTENT $movement;`, `CREATE audit_log:${logId} CONTENT $log;`, "COMMIT TRANSACTION;"];
      await db.query(statements.join(" "), { equipment, file: prepared && fileId ? { ...prepared, entityType: "equipment", entityId: equipmentId, uploadedBy: user.id, createdAt: timestamp } : null, movement, log: { actorId: user.id, action: "equipment.created", entityType: "equipment", entityId: equipmentId, createdAt: timestamp } });
    });
  } catch (error) {
    const message = error instanceof Error && /unique/i.test(error.message) ? "Інвентарний номер уже використовується." : "Не вдалося зареєструвати обладнання.";
    return { formError: message };
  }
  revalidatePath("/equipment"); revalidatePath("/dashboard");
  return {};
}
