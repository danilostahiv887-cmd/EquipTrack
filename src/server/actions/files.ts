"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { normalizeRecordIdString, toRecordId } from "@/lib/db/record-id";
import { queryRows } from "@/lib/db/repository";
import { recordId } from "@/lib/format";

type StoredFile = { id: unknown; entityType?: string; entityId?: string };
type PhotoOwner = { id: unknown; photoFileId?: string; imageFileId?: string };

async function refreshOwnerPhoto(entityType: string, entityId: string, removedFileId: string) {
  if (!["equipment", "room", "category"].includes(entityType)) return;
  const ownerTable = entityType;
  const ownerRecord = toRecordId(entityId);
  const photoField = entityType === "category" ? "imageFileId" : "photoFileId";
  await withDatabase(async (db) => {
    const [owner] = await queryRows<PhotoOwner>(db, `SELECT id, ${photoField} FROM ${ownerTable} WHERE id = $id LIMIT 1;`, { id: ownerRecord });
    if (!owner) return;
    const currentPhoto = normalizeRecordIdString(String(entityType === "category" ? owner.imageFileId ?? "" : owner.photoFileId ?? ""));
    if (currentPhoto !== removedFileId) return;
    const [nextPhoto] = await queryRows<{ id: unknown; createdAt?: string }>(db, "SELECT id, createdAt FROM file WHERE entityId = $entityId AND id != $fileId AND kind = 'photo' ORDER BY createdAt DESC LIMIT 1;", { entityId, fileId: toRecordId(removedFileId) });
    await db.query(`UPDATE $owner SET ${photoField} = $nextPhoto;`, { owner: ownerRecord, nextPhoto: nextPhoto ? recordId(nextPhoto.id) : null });
  });
}

export async function deleteFileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "equipment:manage");

  const fileId = normalizeRecordIdString(String(formData.get("fileId") ?? ""));
  const returnPath = String(formData.get("returnPath") ?? "/documents");
  if (!fileId || fileId === "undefined") throw new Error("Не вказано файл для видалення.");

  const fileRecord = toRecordId(fileId);
  const [file] = await withDatabase((db) => queryRows<StoredFile>(db, "SELECT id, entityType, entityId FROM file WHERE id = $id LIMIT 1;", { id: fileRecord }));
  if (!file) throw new Error("Файл не знайдено.");

  const entityType = String(file.entityType ?? "");
  const entityId = normalizeRecordIdString(String(file.entityId ?? ""));
  await withDatabase((db) => db.query("DELETE $file;", { file: fileRecord }));
  if (entityType && entityId) await refreshOwnerPhoto(entityType, entityId, fileId);

  revalidatePath(returnPath);
  revalidatePath("/documents");
  if (entityType === "equipment" && entityId) revalidatePath(`/equipment/${encodeURIComponent(entityId)}`);
  if (entityType === "room" && entityId) revalidatePath(`/rooms/${encodeURIComponent(entityId)}`);
}
