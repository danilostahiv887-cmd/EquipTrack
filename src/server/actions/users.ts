"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/passwords";
import { withDatabase } from "@/lib/db/client";
import { queryRows } from "@/lib/db/repository";

export type UserActionState = { formError?: string; success?: string };
const schema = z.object({ fullName: z.string().trim().min(3, "Вкажіть повне ім’я."), email: z.string().trim().email("Вкажіть коректну адресу."), password: z.string().min(8, "Пароль має містити щонайменше 8 символів."), role: z.enum(["staff", "inventory_manager", "admin"]), position: z.string().trim().max(120).optional() });

export async function createUserAction(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const actor = await getCurrentUser(); if (!actor) return { formError: "Сеанс завершено." };
  try { assertPermission(actor, "user:manage"); } catch (error) { return { formError: error instanceof Error ? error.message : "Доступ заборонено." }; }
  const parsed = schema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return { formError: parsed.error.issues[0]?.message ?? "Перевірте введені дані." };
  const passwordHash = await hashPassword(parsed.data.password);
  try { await withDatabase((db) => db.query("CREATE user CONTENT $value;", { value: { ...parsed.data, email: parsed.data.email.toLowerCase(), passwordHash, status: "active", createdAt: new Date().toISOString() } })); } catch { return { formError: "Не вдалося створити користувача. Електронна адреса може бути зайнята." }; }
  revalidatePath("/users"); return { success: "Користувача створено." };
}

export async function deactivateUserAction(formData: FormData) {
  const actor = await getCurrentUser(); if (!actor) return;
  assertPermission(actor, "user:manage");
  const id = z.string().regex(/^user:[A-Za-z0-9-]+$/).parse(formData.get("userId"));
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
