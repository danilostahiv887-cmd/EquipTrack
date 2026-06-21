"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { normalizeRecordIdString, toRecordId } from "@/lib/db/record-id";

export type ReferenceActionState = { formError?: string; fieldErrors?: Record<string, string[]>; success?: string };
const kinds = ["building", "room_type", "category"] as const;
const kindSchema = z.enum(kinds, { required_error: "Оберіть тип довідника.", invalid_type_error: "Оберіть тип довідника." });
const schema = z.object({
  kind: kindSchema,
  name: z.string({ required_error: "Вкажіть назву.", invalid_type_error: "Вкажіть назву." }).trim().min(2, "Назва має містити щонайменше 2 символи.").max(120, "Назва має бути коротшою за 120 символів."),
});
const updateSchema = schema.extend({ referenceId: z.string().trim().min(1, "Не вказано запис для редагування.") });
const deleteSchema = z.object({ kind: kindSchema, referenceId: z.string().trim().min(1, "Не вказано запис для видалення.") });

const validationErrors = (error: z.ZodError) => ({
  fieldErrors: Object.fromEntries(Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.length ? value : ["Некоректне значення."]])),
});

async function ensureReferenceAccess() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Сеанс завершено.");
  assertPermission(user, "reference:manage");
  return user;
}

function refreshReferencePages() {
  revalidatePath("/settings");
  revalidatePath("/rooms");
  revalidatePath("/equipment");
}

export async function createReferenceAction(_: ReferenceActionState, formData: FormData): Promise<ReferenceActionState> {
  try { await ensureReferenceAccess(); } catch (error) { return { formError: error instanceof Error ? error.message : "Доступ заборонено." }; }
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrors(parsed.error);
  const id = randomUUID().replaceAll("-", "").slice(0, 12);
  await withDatabase((db) => db.query(`CREATE ${parsed.data.kind}:${id} CONTENT $value;`, {
    value: { name: parsed.data.name, slug: id, createdAt: new Date().toISOString() },
  }));
  refreshReferencePages();
  return { success: "Запис довідника створено." };
}

export async function updateReferenceAction(_: ReferenceActionState, formData: FormData): Promise<ReferenceActionState> {
  try { await ensureReferenceAccess(); } catch (error) { return { formError: error instanceof Error ? error.message : "Доступ заборонено." }; }
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrors(parsed.error);
  await withDatabase((db) => db.query("UPDATE $id MERGE $value;", {
    id: toRecordId(parsed.data.referenceId),
    value: { name: parsed.data.name, updatedAt: new Date().toISOString() },
  }));
  refreshReferencePages();
  return { success: "Запис довідника оновлено." };
}

export async function deleteReferenceAction(formData: FormData) {
  await ensureReferenceAccess();
  const parsed = deleteSchema.parse(Object.fromEntries(formData));
  const id = normalizeRecordIdString(parsed.referenceId);
  if (!id.startsWith(`${parsed.kind}:`)) throw new Error("Запис не належить до вибраного довідника.");
  await withDatabase((db) => db.query("DELETE $id;", { id: toRecordId(id) }));
  refreshReferencePages();
}
