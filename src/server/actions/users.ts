"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/passwords";
import { withDatabase } from "@/lib/db/client";
import { toRecordId } from "@/lib/db/record-id";
import { queryRows } from "@/lib/db/repository";

export type UserActionState = { formError?: string; fieldErrors?: Record<string, string[]>; success?: string; values?: Record<string, string> };
const formValues = (formData: FormData) => Object.fromEntries([...formData.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[0] !== "password"));
const validationErrors = (error: z.ZodError, formData: FormData) => ({
  fieldErrors: Object.fromEntries(Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.length ? value : ["Некоректне значення."]])),
  values: formValues(formData),
});
const requiredText = (message: string) => z.string({ required_error: message, invalid_type_error: message }).trim().min(1, message);
const schema = z.object({
  fullName: requiredText("Вкажіть повне ім’я.").min(3, "Повне ім’я має містити щонайменше 3 символи."),
  email: requiredText("Вкажіть електронну адресу.").email("Вкажіть коректну адресу."),
  password: requiredText("Вкажіть пароль.").min(8, "Пароль має містити щонайменше 8 символів."),
  role: z.enum(["staff", "inventory_manager", "admin"], { required_error: "Оберіть роль користувача.", invalid_type_error: "Оберіть роль користувача." }),
  position: z.string().trim().max(120).optional(),
});
const optionalPassword = z.preprocess((value) => value === "" || value == null ? undefined : value, z.string().min(8, "Пароль має містити щонайменше 8 символів.").optional());
const updateSchema = z.object({
  fullName: requiredText("Вкажіть повне ім’я.").min(3, "Повне ім’я має містити щонайменше 3 символи."),
  email: requiredText("Вкажіть електронну адресу.").email("Вкажіть коректну адресу."),
  password: optionalPassword,
  role: z.enum(["staff", "inventory_manager", "admin"], { required_error: "Оберіть роль користувача.", invalid_type_error: "Оберіть роль користувача." }),
  status: z.enum(["active", "inactive"], { required_error: "Оберіть стан користувача.", invalid_type_error: "Оберіть стан користувача." }),
  position: z.string().trim().max(120).optional(),
});

export async function createUserAction(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await getCurrentUser(); if (!actor) return { formError: "Сеанс завершено." };
  try { assertPermission(actor, "user:manage"); } catch (error) { return { formError: error instanceof Error ? error.message : "Доступ заборонено." }; }
  const parsed = schema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return validationErrors(parsed.error, formData);
  const passwordHash = await hashPassword(parsed.data.password);
  try { await withDatabase((db) => db.query("CREATE user CONTENT $value;", { value: { ...parsed.data, email: parsed.data.email.toLowerCase(), passwordHash, status: "active", createdAt: new Date().toISOString() } })); } catch { return { formError: "Не вдалося створити користувача. Електронна адреса може бути зайнята.", values: formValues(formData) }; }
  revalidatePath("/users"); return { success: "Користувача створено." };
}

export async function updateUserAction(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await getCurrentUser(); if (!actor) return { formError: "Сеанс завершено." };
  try { assertPermission(actor, "user:manage"); } catch (error) { return { formError: error instanceof Error ? error.message : "Доступ заборонено." }; }
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { formError: "Не вказано користувача для редагування." };
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrors(parsed.error, formData);
  const { password, ...rest } = parsed.data;
  const value = { ...rest, email: rest.email.toLowerCase(), ...(password ? { passwordHash: await hashPassword(password) } : {}), updatedAt: new Date().toISOString() };
  try { await withDatabase((db) => db.query("UPDATE $id MERGE $value;", { id: toRecordId(userId), value })); } catch { return { formError: "Не вдалося оновити користувача. Електронна адреса може бути зайнята.", values: formValues(formData) }; }
  revalidatePath("/users"); return { success: "Користувача оновлено." };
}

export async function deactivateUserAction(formData: FormData) {
  const actor = await getCurrentUser(); if (!actor) return;
  assertPermission(actor, "user:manage");
  const id = toRecordId(z.string().regex(/^user:(?:⟨)?[A-Za-z0-9-]+(?:⟩)?$/).parse(formData.get("userId")));
  await withDatabase(async (db) => {
    const [target] = await queryRows<{ role: string; status: string }>(db, "SELECT role, status FROM user WHERE id = $id LIMIT 1;", { id });
    if (!target) throw new Error("Користувача не знайдено.");
    if (target.role === "admin" && target.status === "active") {
      const [count] = await queryRows<{ total: number }>(db, "SELECT count() AS total FROM user WHERE role = 'admin' AND status = 'active' GROUP ALL;");
      if (Number(count?.total ?? 0) <= 1) throw new Error("Не можна деактивувати єдиного активного адміністратора.");
    }
    await db.query("UPDATE $id MERGE { status: 'inactive', updatedAt: $time };", { id, time: new Date().toISOString() });
  });
  revalidatePath("/users");
}
