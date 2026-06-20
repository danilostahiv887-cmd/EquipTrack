"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { roomSchema } from "@/lib/validation/rooms";

export type RoomActionState = { formError?: string; fieldErrors?: Record<string, string> };
export async function createRoomAction(_: RoomActionState, formData: FormData): Promise<RoomActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено. Увійдіть повторно." };
  try { assertPermission(user, "room:manage"); } catch (error) { return { formError: error instanceof Error ? error.message : "Доступ заборонено." }; }
  const parsed = roomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Некоректне значення."])) };
  await withDatabase((db) => db.query("CREATE room CONTENT $value;", { value: { ...parsed.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }));
  revalidatePath("/rooms");
  return {};
}
