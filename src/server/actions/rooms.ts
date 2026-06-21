"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { normalizeRecordIdString, toRecordId } from "@/lib/db/record-id";
import { roomSchema } from "@/lib/validation/rooms";

export type RoomActionState = {
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
};
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

export async function createRoomAction(
  _: RoomActionState,
  formData: FormData,
): Promise<RoomActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено. Увійдіть повторно." };
  try {
    assertPermission(user, "room:manage");
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : "Доступ заборонено.",
    };
  }
  const parsed = roomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrors(parsed.error, formData);
  await withDatabase((db) =>
    db.query("CREATE room CONTENT $value;", {
      value: {
        ...parsed.data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),
  );
  revalidatePath("/rooms");
  return {};
}

export async function updateRoomAction(
  _: RoomActionState,
  formData: FormData,
): Promise<RoomActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено. Увійдіть повторно." };
  try {
    assertPermission(user, "room:manage");
  } catch (error) {
    return {
      formError: error instanceof Error ? error.message : "Доступ заборонено.",
    };
  }
  const roomId = String(formData.get("roomId") ?? "");
  if (!roomId) return { formError: "Не вказано приміщення для редагування." };
  const parsed = roomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrors(parsed.error, formData);
  const id = toRecordId(roomId);
  await withDatabase((db) =>
    db.query("UPDATE $id MERGE $value;", {
      id,
      value: { ...parsed.data, updatedAt: new Date().toISOString() },
    }),
  );
  revalidatePath("/rooms");
  revalidatePath(
    `/rooms/${encodeURIComponent(normalizeRecordIdString(roomId))}`,
  );
  return {};
}

export async function deleteRoomAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "room:manage");
  const roomId = String(formData.get("roomId") ?? "");
  if (!roomId) throw new Error("Не вказано приміщення для видалення.");
  const id = toRecordId(roomId);
  const textId = normalizeRecordIdString(roomId);
  await withDatabase((db) =>
    db.query(
      "BEGIN TRANSACTION; DELETE $id; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
      {
        id,
        log: {
          actorId: user.id,
          action: "room.deleted",
          entityType: "room",
          entityId: textId,
          createdAt: new Date().toISOString(),
        },
      },
    ),
  );
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  redirect("/rooms");
}
