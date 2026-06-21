"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { normalizeRecordIdString, toRecordId } from "@/lib/db/record-id";
import { queryRows } from "@/lib/db/repository";

export type ReferenceActionState = {
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
  success?: string;
};
const kinds = ["building", "room_type", "category", "supplier"] as const;
const kindSchema = z.enum(kinds, {
  required_error: "Оберіть тип довідника.",
  invalid_type_error: "Оберіть тип довідника.",
});
const optionalText = (limit: number, message: string) =>
  z
    .string()
    .trim()
    .max(limit, message)
    .optional()
    .transform((value) => value || undefined);
const formValues = (formData: FormData) =>
  Object.fromEntries(
    [...formData.entries()].filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
const schema = z.object({
  kind: kindSchema,
  name: z
    .string({
      required_error: "Вкажіть назву.",
      invalid_type_error: "Вкажіть назву.",
    })
    .trim()
    .min(2, "Назва має містити щонайменше 2 символи.")
    .max(120, "Назва має бути коротшою за 120 символів."),
  type: z
    .enum(["постачальник", "донор", "сервіс", "підрядник"], {
      invalid_type_error: "Оберіть тип постачальника.",
    })
    .optional(),
  contactPerson: optionalText(120, "Контактна особа має бути коротшою."),
  phone: optionalText(40, "Телефон має бути коротшим."),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.string().email("Вкажіть коректну електронну пошту.").optional()),
  note: optionalText(320, "Примітка має бути коротшою за 320 символів."),
});
const updateSchema = schema.extend({
  referenceId: z.string().trim().min(1, "Не вказано запис для редагування."),
});
const deleteSchema = z.object({
  kind: kindSchema,
  referenceId: z.string().trim().min(1, "Не вказано запис для видалення."),
});

const validationErrors = (error: z.ZodError, formData: FormData) => ({
  fieldErrors: Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([key, value]) => [
      key,
      value?.length ? value : ["Некоректне значення."],
    ]),
  ),
  values: formValues(formData),
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

function referenceValue(data: z.infer<typeof schema>) {
  const timestamp = new Date().toISOString();
  if (data.kind !== "supplier")
    return { name: data.name, updatedAt: timestamp };
  return {
    name: data.name,
    type: data.type ?? "постачальник",
    contactPerson: data.contactPerson,
    phone: data.phone,
    email: data.email,
    note: data.note,
    updatedAt: timestamp,
  };
}

export async function createReferenceAction(
  _: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  try {
    await ensureReferenceAccess();
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : "Доступ заборонено.",
    };
  }
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrors(parsed.error, formData);
  const id = randomUUID().replaceAll("-", "").slice(0, 12);
  await withDatabase((db) =>
    db.query(`CREATE ${parsed.data.kind}:${id} CONTENT $value;`, {
      value: {
        ...referenceValue(parsed.data),
        slug: id,
        createdAt: new Date().toISOString(),
      },
    }),
  );
  refreshReferencePages();
  return { success: "Запис довідника створено." };
}

export async function updateReferenceAction(
  _: ReferenceActionState,
  formData: FormData,
): Promise<ReferenceActionState> {
  try {
    await ensureReferenceAccess();
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : "Доступ заборонено.",
    };
  }
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrors(parsed.error, formData);
  await withDatabase((db) =>
    db.query("UPDATE $id MERGE $value;", {
      id: toRecordId(parsed.data.referenceId),
      value: referenceValue(parsed.data),
    }),
  );
  refreshReferencePages();
  return { success: "Запис довідника оновлено." };
}

export async function deleteReferenceAction(formData: FormData) {
  await ensureReferenceAccess();
  const parsed = deleteSchema.parse(Object.fromEntries(formData));
  const id = normalizeRecordIdString(parsed.referenceId);
  if (!id.startsWith(`${parsed.kind}:`))
    throw new Error("Запис не належить до вибраного довідника.");
  await withDatabase(async (db) => {
    if (parsed.kind === "supplier") {
      const [modelUsage] = await queryRows<{ total?: number }>(
        db,
        "SELECT count() AS total FROM equipment WHERE supplierId = $id GROUP ALL;",
        { id },
      );
      const [instanceUsage] = await queryRows<{ total?: number }>(
        db,
        "SELECT count() AS total FROM equipment_instance WHERE supplierId = $id GROUP ALL;",
        { id },
      );
      const total =
        Number(modelUsage?.total ?? 0) + Number(instanceUsage?.total ?? 0);
      if (total > 0)
        throw new Error(
          "Постачальника не можна видалити, доки з ним пов’язані засоби.",
        );
    }
    await db.query("DELETE $id;", { id: toRecordId(id) });
  });
  refreshReferencePages();
}
