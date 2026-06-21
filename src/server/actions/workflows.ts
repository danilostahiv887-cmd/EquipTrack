"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission, can } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { normalizeRecordIdString, toRecordId } from "@/lib/db/record-id";
import { queryRows } from "@/lib/db/repository";

export type WorkflowActionState = {
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  success?: string;
  values?: Record<string, string>;
};
const formValues = (formData: FormData) =>
  Object.fromEntries(
    [...formData.entries()].filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
const initialError = (error: unknown, formData?: FormData) => ({
  formError: error instanceof Error ? error.message : "Операцію не виконано.",
  ...(formData ? { values: formValues(formData) } : {}),
});
const generated = (table: string) =>
  `${table}:${randomUUID().replaceAll("-", "")}`;
const requiredText = (message: string) =>
  z
    .string({ required_error: message, invalid_type_error: message })
    .trim()
    .min(1, message);
const equipmentId = requiredText("Оберіть екземпляр обладнання.").regex(
  /^equipment_instance:[A-Za-z0-9_-]+$/,
  "Некоректний екземпляр обладнання.",
);
const roomId = requiredText("Оберіть приміщення.").regex(
  /^room:[A-Za-z0-9-]+$/,
  "Некоректне приміщення.",
);
const transferSchema = z.object({
  equipmentId,
  fromRoomId: roomId,
  toRoomId: roomId,
  reason: requiredText("Опишіть причину передачі.").min(
    4,
    "Причина має містити щонайменше 4 символи.",
  ),
});
const requiredNumber = (message: string) =>
  z.preprocess(
    (value) => (String(value ?? "").trim() === "" ? undefined : value),
    z.coerce.number({
      required_error: message,
      invalid_type_error: "Кількість має бути числом.",
    }),
  );
const movementSchema = z.object({
  equipmentId,
  toRoomId: roomId,
  movementType: z.enum(
    [
      "transferred",
      "returned_to_storage",
      "sent_to_repair",
      "returned_from_repair",
      "corrected",
    ],
    {
      required_error: "Оберіть тип руху.",
      invalid_type_error: "Оберіть тип руху.",
    },
  ),
  reason: requiredText("Опишіть причину руху.").min(
    4,
    "Причина має містити щонайменше 4 символи.",
  ),
});
const repairSchema = z.object({
  equipmentId,
  roomId,
  issueDescription: requiredText("Опишіть несправність.").min(
    6,
    "Опис несправності має містити щонайменше 6 символів.",
  ),
  severity: z.enum(["low", "medium", "high"], {
    required_error: "Оберіть серйозність несправності.",
    invalid_type_error: "Оберіть серйозність несправності.",
  }),
});
const recordRef = (message: string) =>
  z
    .string({ required_error: message, invalid_type_error: message })
    .trim()
    .min(1, message)
    .transform((value) => toRecordId(value));
const auditSchema = z.object({
  title: requiredText("Вкажіть назву аудиту.").min(
    4,
    "Назва аудиту має містити щонайменше 4 символи.",
  ),
  roomId,
  plannedDate: requiredText("Вкажіть заплановану дату."),
  auditScope: requiredText("Опишіть перелік або обсяг перевірки.").min(
    6,
    "Обсяг перевірки має містити щонайменше 6 символів.",
  ),
  expectedItemCount: requiredNumber(
    "Вкажіть очікувану кількість позицій.",
  ).pipe(
    z
      .number()
      .int("Кількість має бути цілим числом.")
      .min(0, "Кількість не може бути від’ємною.")
      .max(999, "Кількість завелика для одного аудиту."),
  ),
  auditNote: z
    .string()
    .trim()
    .max(600, "Примітка має містити не більше 600 символів.")
    .optional(),
});
const auditUpdateSchema = auditSchema.extend({
  auditId: recordRef("Некоректний аудит."),
});
const auditStateSchema = z.object({ auditId: recordRef("Некоректний аудит.") });
const auditItemStateSchema = z.object({
  auditId: recordRef("Некоректний аудит."),
  auditItemId: recordRef("Некоректний рядок перевірки."),
});
const auditScanSchema = z
  .object({
    auditId: recordRef("Некоректний аудит."),
    code: z.string().trim().optional(),
    actualCondition: z.enum(
      ["good", "satisfactory", "needs_repair", "damaged", "unusable"],
      {
        required_error: "Оберіть фактичний стан.",
        invalid_type_error: "Оберіть фактичний стан.",
      },
    ),
    note: z
      .string()
      .trim()
      .max(400, "Примітка має містити не більше 400 символів.")
      .optional(),
  })
  .superRefine((value, ctx) => {
    const hasCode = Boolean(value.code?.trim());
    if (hasCode && String(value.code).trim().length < 2)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["code"],
        message: "Номер має містити щонайменше 2 символи.",
      });
  });
const writeoffSchema = z.object({
  equipmentId,
  reason: requiredText("Вкажіть обґрунтування списання.").min(
    6,
    "Обґрунтування має містити щонайменше 6 символів.",
  ),
});
const repairTransitionSchema = z.object({
  repairId: recordRef("Некоректна заявка на ремонт."),
  status: z.enum([
    "under_review",
    "sent_to_repair",
    "repaired",
    "not_repairable",
    "cancelled",
  ]),
});
const requestId = recordRef("Некоректна заявка.");
const writeoffRequestId = recordRef("Некоректний запит на списання.");

function fieldErrors(error: z.ZodError, formData?: FormData) {
  return {
    fieldErrors: Object.fromEntries(
      Object.entries(error.flatten().fieldErrors).map(([key, value]) => [
        key,
        value?.length ? value : ["Некоректне значення."],
      ]),
    ),
    ...(formData ? { values: formValues(formData) } : {}),
  };
}

async function addNotification(userId: string, title: string, body: string) {
  await withDatabase((db) =>
    db.query("CREATE notification CONTENT $value;", {
      value: {
        userId,
        type: "system",
        title,
        body,
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    }),
  );
}

export async function createTransferRequestAction(
  _: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено." };
  try {
    assertPermission(user, "request:create");
  } catch (error) {
    return initialError(error, formData);
  }
  const parsed = transferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const timestamp = new Date().toISOString();
  await withDatabase((db) =>
    db.query("CREATE transfer_request CONTENT $value;", {
      value: {
        ...parsed.data,
        requestedBy: user.id,
        status: "submitted",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }),
  );
  await addNotification(
    "user:manager-1",
    "Нова заявка на передачу",
    "Перегляньте нову заявку на переміщення обладнання.",
  );
  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return { success: "Заявку подано на розгляд." };
}

export async function createMovementAction(
  _: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено." };
  try {
    assertPermission(user, "movement:manage");
  } catch (error) {
    return initialError(error, formData);
  }
  const parsed = movementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  let modelId = "";
  try {
    await withDatabase(async (db) => {
      const [equipment] = await queryRows<{
        id: unknown;
        equipmentId?: string;
        currentRoomId?: string;
        currentResponsibleId?: string;
        status?: string;
      }>(
        db,
        "SELECT id, equipmentId, currentRoomId, currentResponsibleId, status FROM equipment_instance WHERE id = $id LIMIT 1;",
        { id: toRecordId(parsed.data.equipmentId) },
      );
      if (!equipment) throw new Error("Обладнання не знайдено.");
      if (equipment.status === "written_off")
        throw new Error("Списане обладнання не можна переміщувати.");
      modelId = normalizeRecordIdString(equipment.equipmentId ?? "");
      const fromRoomId = normalizeRecordIdString(equipment.currentRoomId ?? "");
      if (fromRoomId === parsed.data.toRoomId)
        throw new Error(
          "Оберіть інше приміщення: обладнання вже знаходиться там.",
        );

      const timestamp = new Date().toISOString();
      const movementId = generated("movement");
      await db.query(
        `BEGIN TRANSACTION;
        UPDATE $equipment SET currentRoomId = $toRoom, status = 'active', updatedAt = $time;
        CREATE ${movementId} CONTENT $movement;
        CREATE audit_log CONTENT $log;
        COMMIT TRANSACTION;`,
        {
          equipment: toRecordId(parsed.data.equipmentId),
          toRoom: parsed.data.toRoomId,
          time: timestamp,
          movement: {
            equipmentId: parsed.data.equipmentId,
            movementType: parsed.data.movementType,
            fromRoomId: fromRoomId || undefined,
            toRoomId: parsed.data.toRoomId,
            performedBy: user.id,
            acceptedBy: equipment.currentResponsibleId,
            movementDate: timestamp,
            reason: parsed.data.reason,
            createdAt: timestamp,
          },
          log: {
            actorId: user.id,
            action: "movement.created",
            entityType: "equipment_instance",
            entityId: parsed.data.equipmentId,
            createdAt: timestamp,
          },
        },
      );
    });
  } catch (error) {
    return initialError(error, formData);
  }
  revalidatePath("/movements");
  revalidatePath("/equipment");
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  if (modelId) revalidatePath(`/equipment/${encodeURIComponent(modelId)}`);
  revalidatePath(`/rooms/${encodeURIComponent(parsed.data.toRoomId)}`);
  return { success: "Рух обладнання створено й місце розташування оновлено." };
}

export async function createRepairAction(
  _: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено." };
  try {
    assertPermission(user, "repair:report");
  } catch (error) {
    return initialError(error, formData);
  }
  const parsed = repairSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const timestamp = new Date().toISOString();
  await withDatabase((db) =>
    db.query("CREATE repair CONTENT $value;", {
      value: {
        ...parsed.data,
        reportedBy: user.id,
        status: "reported",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }),
  );
  await addNotification(
    "user:manager-1",
    "Повідомлення про несправність",
    "Надійшло нове повідомлення про ремонт.",
  );
  revalidatePath("/repairs");
  revalidatePath("/dashboard");
  return { success: "Повідомлення про несправність зареєстровано." };
}

export async function transitionRepairAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "repair:manage");
  const parsed = repairTransitionSchema.parse(Object.fromEntries(formData));
  const targetStatus = parsed.status;
  await withDatabase(async (db) => {
    const [repair] = await queryRows<{
      id: unknown;
      equipmentId: string;
      roomId?: string;
      status: string;
      issueDescription?: string;
      severity?: string;
    }>(db, "SELECT * FROM repair WHERE id = $id LIMIT 1;", {
      id: parsed.repairId,
    });
    if (!repair) throw new Error("Заявку на ремонт не знайдено.");
    const allowed: Record<string, string[]> = {
      reported: ["under_review", "cancelled"],
      under_review: [
        "sent_to_repair",
        "repaired",
        "not_repairable",
        "cancelled",
      ],
      sent_to_repair: ["repaired", "not_repairable", "cancelled"],
      repaired: [],
      not_repairable: [],
      cancelled: [],
    };
    if (!allowed[repair.status]?.includes(targetStatus))
      throw new Error("Такий перехід стану ремонту недоступний.");
    const timestamp = new Date().toISOString();
    const movementId = ["sent_to_repair", "repaired"].includes(targetStatus)
      ? generated("movement")
      : "";
    const equipmentPatch =
      targetStatus === "sent_to_repair"
        ? {
            status: "in_repair",
            condition: "needs_repair",
            updatedAt: timestamp,
          }
        : targetStatus === "repaired"
          ? { status: "active", condition: "good", updatedAt: timestamp }
          : targetStatus === "not_repairable"
            ? {
                status: "in_storage",
                condition: "unusable",
                updatedAt: timestamp,
              }
            : undefined;
    const movementType =
      targetStatus === "sent_to_repair"
        ? "sent_to_repair"
        : targetStatus === "repaired"
          ? "returned_from_repair"
          : "";
    const statements = [
      "BEGIN TRANSACTION;",
      "UPDATE $repair MERGE { status: $status, handledBy: $actor, updatedAt: $time };",
      ...(equipmentPatch ? ["UPDATE $equipment MERGE $equipmentPatch;"] : []),
      ...(movementType ? [`CREATE ${movementId} CONTENT $movement;`] : []),
      "CREATE audit_log CONTENT $log;",
      "COMMIT TRANSACTION;",
    ];
    await db.query(statements.join(" "), {
      repair: parsed.repairId,
      equipment: toRecordId(repair.equipmentId),
      equipmentPatch,
      status: targetStatus,
      actor: user.id,
      time: timestamp,
      movement: movementType
        ? {
            equipmentId: repair.equipmentId,
            movementType,
            fromRoomId: repair.roomId,
            toRoomId: repair.roomId,
            performedBy: user.id,
            movementDate: timestamp,
            reason: repair.issueDescription ?? "Операція ремонту",
            createdAt: timestamp,
          }
        : null,
      log: {
        actorId: user.id,
        action: "repair.updated",
        entityType: "repair",
        entityId: normalizeRecordIdString(parsed.repairId),
        createdAt: timestamp,
      },
    });
  });
  revalidatePath("/repairs");
  revalidatePath("/equipment");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  const notificationId = recordRef("Некоректне сповіщення.").parse(
    formData.get("notificationId"),
  );
  await withDatabase((db) =>
    db.query("UPDATE $id MERGE { isRead: true, readAt: $time };", {
      id: notificationId,
      time: new Date().toISOString(),
    }),
  );
  revalidatePath("/notifications");
}

export async function decideTransferRequestAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "request:manage");
  const id = requestId.parse(formData.get("requestId"));
  const decision = z
    .enum(["approved", "rejected"])
    .parse(formData.get("decision"));
  await withDatabase(async (db) => {
    const [request] = await queryRows<{ requestedBy: string }>(
      db,
      "SELECT requestedBy FROM transfer_request WHERE id = $id LIMIT 1;",
      { id },
    );
    if (!request) throw new Error("Заявку не знайдено.");
    if (request.requestedBy === user.id)
      throw new Error("Не можна погодити власну заявку.");
    const time = new Date().toISOString();
    const decisionPatch =
      decision === "approved" ? { approvedAt: time } : { rejectedAt: time };
    await db.query("UPDATE $id MERGE $value;", {
      id,
      value: {
        status: decision,
        approvedBy: user.id,
        updatedAt: time,
        ...decisionPatch,
      },
    });
    await db.query("CREATE notification CONTENT $value;", {
      value: {
        userId: request.requestedBy,
        type: "transfer_request",
        title:
          decision === "approved" ? "Заявку погоджено" : "Заявку відхилено",
        body:
          decision === "approved"
            ? "Менеджер погодив передачу обладнання."
            : "Менеджер відхилив передачу обладнання.",
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });
  });
  revalidatePath("/requests");
}

export async function completeTransferRequestAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "request:manage");
  const id = requestId.parse(formData.get("requestId"));
  await withDatabase(async (db) => {
    const [request] = await queryRows<{
      equipmentId: string;
      fromRoomId: string;
      toRoomId: string;
      requestedBy: string;
      reason: string;
      status: string;
    }>(db, "SELECT * FROM transfer_request WHERE id = $id LIMIT 1;", { id });
    if (!request || request.status !== "approved")
      throw new Error("Погоджену заявку не знайдено.");
    equipmentId.parse(request.equipmentId);
    roomId.parse(request.toRoomId);
    const timestamp = new Date().toISOString();
    const movementId = generated("movement");
    await db.query(
      `BEGIN TRANSACTION; UPDATE $equipment MERGE { currentRoomId: $room, status: 'active', updatedAt: $time }; UPDATE $request MERGE { status: 'completed', completedBy: $actor, completedAt: $time, updatedAt: $time }; CREATE ${movementId} CONTENT $movement; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;`,
      {
        equipment: toRecordId(request.equipmentId),
        request: id,
        room: request.toRoomId,
        actor: user.id,
        time: timestamp,
        movement: {
          equipmentId: request.equipmentId,
          movementType: "transferred",
          fromRoomId: request.fromRoomId,
          toRoomId: request.toRoomId,
          performedBy: user.id,
          movementDate: timestamp,
          reason: request.reason,
          createdAt: timestamp,
        },
        log: {
          actorId: user.id,
          action: "transfer.completed",
          entityType: "transfer_request",
          entityId: normalizeRecordIdString(id),
          createdAt: timestamp,
        },
      },
    );
  });
  revalidatePath("/requests");
  revalidatePath("/movements");
  revalidatePath("/equipment");
  revalidatePath("/dashboard");
}

export async function createAuditAction(
  _: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено." };
  try {
    assertPermission(user, "audit:manage");
  } catch (error) {
    return initialError(error, formData);
  }
  const parsed = auditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const timestamp = new Date().toISOString();
  const auditId = generated("audit");
  await withDatabase(async (db) => {
    const assets = await queryRows<{
      id: unknown;
      currentRoomId: string;
      condition: string;
      serialNumber?: string;
      inventoryNumber?: string;
    }>(
      db,
      "SELECT id, currentRoomId, condition, serialNumber, inventoryNumber FROM equipment_instance WHERE currentRoomId = $roomId;",
      { roomId: parsed.data.roomId },
    );
    await db.query(
      `BEGIN TRANSACTION; CREATE ${auditId} CONTENT $audit; ${assets.map((_, index) => `CREATE audit_item:item${index}${auditId.replace("audit:", "")} CONTENT $item${index};`).join(" ")} COMMIT TRANSACTION;`,
      {
        audit: {
          ...parsed.data,
          auditNote: parsed.data.auditNote || undefined,
          actualItemCount: 0,
          expectedRegisteredCount: assets.length,
          status: "planned",
          createdBy: user.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        ...Object.fromEntries(
          assets.map((asset, index) => [
            `item${index}`,
            {
              auditId,
              equipmentId: normalizeRecordIdString(asset.id),
              expectedRoomId: asset.currentRoomId,
              expectedSerialNumber: asset.serialNumber,
              expectedInventoryNumber: asset.inventoryNumber,
              expectedCondition: asset.condition,
              resultStatus: "pending",
              createdAt: timestamp,
            },
          ]),
        ),
      },
    );
  });
  revalidatePath("/audits");
  return { success: "Аудит створено." };
}

export async function updateAuditAction(
  _: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено." };
  try {
    assertPermission(user, "audit:manage");
  } catch (error) {
    return initialError(error, formData);
  }
  const parsed = auditUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const timestamp = new Date().toISOString();
  try {
    await withDatabase(async (db) => {
      const [audit] = await queryRows<{ status: string }>(
        db,
        "SELECT status FROM audit WHERE id = $id LIMIT 1;",
        { id: parsed.data.auditId },
      );
      if (!audit) throw new Error("Аудит не знайдено.");
      if (audit.status === "completed")
        throw new Error("Завершений аудит не можна редагувати.");
      await db.query("UPDATE $id MERGE $value;", {
        id: parsed.data.auditId,
        value: {
          title: parsed.data.title,
          roomId: parsed.data.roomId,
          plannedDate: parsed.data.plannedDate,
          auditScope: parsed.data.auditScope,
          expectedItemCount: parsed.data.expectedItemCount,
          auditNote: parsed.data.auditNote || undefined,
          updatedAt: timestamp,
        },
      });
    });
  } catch (error) {
    return initialError(error, formData);
  }
  revalidatePath("/audits");
  return { success: "Аудит оновлено." };
}

export async function startAuditAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "audit:manage");
  const parsed = auditStateSchema.parse(Object.fromEntries(formData));
  const timestamp = new Date().toISOString();
  await withDatabase(async (db) => {
    const [audit] = await queryRows<{ status: string }>(
      db,
      "SELECT status FROM audit WHERE id = $id LIMIT 1;",
      { id: parsed.auditId },
    );
    if (!audit) throw new Error("Аудит не знайдено.");
    if (audit.status !== "planned")
      throw new Error("Почати можна лише запланований аудит.");
    await db.query(
      "BEGIN TRANSACTION; UPDATE $id MERGE { status: 'in_progress', startedAt: $time, updatedAt: $time, checkedBy: $actor }; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
      {
        id: parsed.auditId,
        time: timestamp,
        actor: user.id,
        log: {
          actorId: user.id,
          action: "audit.started",
          entityType: "audit",
          entityId: normalizeRecordIdString(parsed.auditId),
          createdAt: timestamp,
        },
      },
    );
  });
  revalidatePath("/audits");
  revalidatePath("/dashboard");
}

export async function cancelAuditAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "audit:manage");
  const parsed = auditStateSchema.parse(Object.fromEntries(formData));
  const timestamp = new Date().toISOString();
  await withDatabase(async (db) => {
    const [audit] = await queryRows<{ status: string }>(
      db,
      "SELECT status FROM audit WHERE id = $id LIMIT 1;",
      { id: parsed.auditId },
    );
    if (!audit) throw new Error("Аудит не знайдено.");
    if (!["planned", "in_progress"].includes(audit.status))
      throw new Error("Скасувати можна лише запланований або активний аудит.");
    await db.query(
      "BEGIN TRANSACTION; UPDATE $id MERGE { status: 'cancelled', cancelledAt: $time, updatedAt: $time, checkedBy: $actor }; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
      {
        id: parsed.auditId,
        time: timestamp,
        actor: user.id,
        log: {
          actorId: user.id,
          action: "audit.cancelled",
          entityType: "audit",
          entityId: normalizeRecordIdString(parsed.auditId),
          createdAt: timestamp,
        },
      },
    );
  });
  revalidatePath("/audits");
  revalidatePath("/dashboard");
}

export async function deleteAuditAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "audit:manage");
  const parsed = auditStateSchema.parse(Object.fromEntries(formData));
  const textId = normalizeRecordIdString(parsed.auditId);
  await withDatabase((db) =>
    db.query(
      "BEGIN TRANSACTION; DELETE $id; DELETE audit_item WHERE auditId = $textId; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
      {
        id: parsed.auditId,
        textId,
        log: {
          actorId: user.id,
          action: "audit.deleted",
          entityType: "audit",
          entityId: textId,
          createdAt: new Date().toISOString(),
        },
      },
    ),
  );
  revalidatePath("/audits");
  revalidatePath("/dashboard");
}

export async function scanAuditItemAction(
  _: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено." };
  try {
    assertPermission(user, "audit:manage");
  } catch (error) {
    return initialError(error, formData);
  }
  const selectedInstanceIds = [
    ...new Set(
      formData
        .getAll("equipmentIds")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  const parsed = auditScanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  if (!selectedInstanceIds.length && !parsed.data.code?.trim()) {
    return {
      fieldErrors: {
        code: [
          "Оберіть один або кілька екземплярів або введіть серійний/інвентарний номер.",
        ],
      },
      values: formValues(formData),
    };
  }
  if (
    selectedInstanceIds.some(
      (id) => !/^equipment_instance:[A-Za-z0-9_-]+$/.test(id),
    )
  ) {
    return {
      fieldErrors: {
        equipmentId: ["Серед вибраних екземплярів є некоректний запис."],
      },
      values: formValues(formData),
    };
  }
  const timestamp = new Date().toISOString();
  try {
    await withDatabase(async (db) => {
      const auditText = normalizeRecordIdString(parsed.data.auditId);
      const [audit] = await queryRows<{
        id: unknown;
        roomId: string;
        status: string;
      }>(db, "SELECT id, roomId, status FROM audit WHERE id = $id LIMIT 1;", {
        id: parsed.data.auditId,
      });
      if (!audit) throw new Error("Аудит не знайдено.");
      if (audit.status !== "in_progress")
        throw new Error(
          "Вносити знайдені екземпляри можна лише в аудиті зі станом «У роботі».",
        );
      const code = parsed.data.code?.trim() ?? "";
      const selectedRecords = selectedInstanceIds.map((id) => toRecordId(id));
      const selectedEquipment = selectedRecords.length
        ? await queryRows<{
            id: unknown;
            equipmentId?: string;
            inventoryNumber?: string;
            serialNumber?: string;
            currentRoomId?: string;
            condition?: string;
          }>(
            db,
            "SELECT id, equipmentId, inventoryNumber, serialNumber, currentRoomId, condition FROM equipment_instance WHERE id IN $ids;",
            { ids: selectedRecords },
          )
        : [];
      const manualEquipment =
        !selectedEquipment.length && code
          ? await queryRows<{
              id: unknown;
              equipmentId?: string;
              inventoryNumber?: string;
              serialNumber?: string;
              currentRoomId?: string;
              condition?: string;
            }>(
              db,
              "SELECT id, equipmentId, inventoryNumber, serialNumber, currentRoomId, condition FROM equipment_instance WHERE serialNumber = $code OR inventoryNumber = $code LIMIT 1;",
              { code },
            )
          : [];
      const equipmentRows = selectedEquipment.length
        ? selectedEquipment
        : manualEquipment;

      if (
        selectedInstanceIds.length &&
        selectedEquipment.length !== selectedInstanceIds.length
      )
        throw new Error(
          "Один або кілька вибраних екземплярів не знайдено в реєстрі.",
        );

      if (!equipmentRows.length) {
        const [duplicateUnknown] = code
          ? await queryRows<{ id: unknown }>(
              db,
              "SELECT id FROM audit_item WHERE auditId = $auditId AND scannedCode = $code LIMIT 1;",
              { auditId: auditText, code },
            )
          : [];
        if (duplicateUnknown)
          throw new Error(
            "Цей номер уже внесено до аудиту. Якщо запис помилковий — приберіть його у списку перевірених екземплярів.",
          );
        const itemId = generated("audit_item");
        await db.query(
          `BEGIN TRANSACTION; CREATE ${itemId} CONTENT $item; UPDATE $audit MERGE { updatedAt: $time }; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;`,
          {
            audit: parsed.data.auditId,
            time: timestamp,
            item: {
              auditId: auditText,
              scannedCode: code,
              actualRoomId: audit.roomId,
              actualCondition: parsed.data.actualCondition,
              resultStatus: "unknown",
              note:
                parsed.data.note || "Номер не знайдено в реєстрі обладнання.",
              checkedBy: user.id,
              checkedAt: timestamp,
              createdAt: timestamp,
            },
            log: {
              actorId: user.id,
              action: "audit.item_scanned",
              entityType: "audit",
              entityId: auditText,
              createdAt: timestamp,
            },
          },
        );
        return;
      }

      const auditRoomId = normalizeRecordIdString(audit.roomId);
      const items = await queryRows<{
        id: unknown;
        equipmentId?: string;
        resultStatus?: string;
      }>(
        db,
        "SELECT id, equipmentId, resultStatus FROM audit_item WHERE auditId = $auditId;",
        { auditId: auditText },
      );
      const existingByEquipment = new Map(
        items.map((item) => [
          normalizeRecordIdString(item.equipmentId ?? ""),
          item,
        ]),
      );
      const statements: string[] = [];
      const params: Record<string, unknown> = {
        audit: parsed.data.auditId,
        time: timestamp,
        log: {
          actorId: user.id,
          action: "audit.item_scanned",
          entityType: "audit",
          entityId: auditText,
          createdAt: timestamp,
        },
      };
      const misplacedItems: Array<{
        inventoryNumber?: string;
        serialNumber?: string;
      }> = [];

      equipmentRows.forEach((equipment, index) => {
        const equipmentIdText = normalizeRecordIdString(equipment.id);
        const expectedRoomId = normalizeRecordIdString(
          equipment.currentRoomId ?? "",
        );
        const resultStatus =
          expectedRoomId === auditRoomId
            ? ["damaged", "unusable"].includes(parsed.data.actualCondition)
              ? "damaged"
              : "found"
            : "misplaced";
        const existing = existingByEquipment.get(equipmentIdText);
        if (
          existing?.id &&
          existing.resultStatus &&
          existing.resultStatus !== "pending"
        ) {
          throw new Error(
            `Екземпляр ${equipment.inventoryNumber ?? equipment.serialNumber ?? equipmentIdText} уже внесено до аудиту. Якщо запис помилковий — спочатку приберіть його у списку перевірених екземплярів.`,
          );
        }
        const item = {
          auditId: auditText,
          equipmentId: equipmentIdText,
          expectedRoomId: equipment.currentRoomId,
          actualRoomId: audit.roomId,
          expectedSerialNumber: equipment.serialNumber,
          expectedInventoryNumber: equipment.inventoryNumber,
          actualCondition: parsed.data.actualCondition,
          expectedCondition: equipment.condition,
          resultStatus,
          note: parsed.data.note || undefined,
          checkedBy: user.id,
          checkedAt: timestamp,
          updatedAt: timestamp,
        };
        if (resultStatus === "misplaced")
          misplacedItems.push({
            inventoryNumber: equipment.inventoryNumber,
            serialNumber: equipment.serialNumber,
          });
        params[`item${index}`] = item;
        if (existing?.id) {
          params[`itemId${index}`] = toRecordId(
            normalizeRecordIdString(existing.id),
          );
          statements.push(`UPDATE $itemId${index} MERGE $item${index};`);
        } else {
          statements.push(
            `CREATE ${generated("audit_item")} CONTENT $item${index};`,
          );
        }
      });

      if (misplacedItems.length) {
        const managers = await queryRows<{ id: unknown }>(
          db,
          "SELECT id FROM user WHERE status = 'active' AND (role = 'admin' OR role = 'inventory_manager');",
        );
        managers.forEach((manager, index) => {
          const title = "Розбіжність аудиту";
          const body =
            misplacedItems.length === 1
              ? `Під час аудиту знайдено не в цьому приміщенні: ${misplacedItems[0].inventoryNumber ?? misplacedItems[0].serialNumber ?? "екземпляр без номера"}.`
              : `Під час аудиту знайдено ${misplacedItems.length} екземпляри не з цього приміщення. Перевірте деталі аудиту.`;
          params[`notification${index}`] = {
            userId: normalizeRecordIdString(manager.id),
            type: "system",
            title,
            body,
            isRead: false,
            createdAt: timestamp,
          };
          statements.push(`CREATE notification CONTENT $notification${index};`);
        });
      }
      await db.query(
        `BEGIN TRANSACTION; ${statements.join(" ")} UPDATE $audit MERGE { updatedAt: $time }; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;`,
        params,
      );
    });
  } catch (error) {
    return initialError(error, formData);
  }
  revalidatePath("/audits");
  return {
    success:
      selectedInstanceIds.length > 1
        ? "Екземпляри внесено до аудиту."
        : "Екземпляр внесено до аудиту.",
  };
}

export async function deleteAuditItemAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "audit:manage");
  const parsed = auditItemStateSchema.parse(Object.fromEntries(formData));
  const timestamp = new Date().toISOString();
  await withDatabase(async (db) => {
    const auditText = normalizeRecordIdString(parsed.auditId);
    const [audit] = await queryRows<{
      id: unknown;
      roomId?: string;
      status: string;
    }>(db, "SELECT id, roomId, status FROM audit WHERE id = $id LIMIT 1;", {
      id: parsed.auditId,
    });
    if (!audit) throw new Error("Аудит не знайдено.");
    if (audit.status !== "in_progress")
      throw new Error(
        "Прибирати внесені екземпляри можна лише в аудиті зі станом «У роботі».",
      );
    const [item] = await queryRows<{
      id: unknown;
      auditId?: string;
      equipmentId?: string;
      expectedRoomId?: string;
      resultStatus?: string;
    }>(
      db,
      "SELECT id, auditId, equipmentId, expectedRoomId, resultStatus FROM audit_item WHERE id = $id AND auditId = $auditId LIMIT 1;",
      { id: parsed.auditItemId, auditId: auditText },
    );
    if (!item) throw new Error("Рядок перевірки не знайдено.");
    const isExpectedForRoom =
      Boolean(item.equipmentId) &&
      normalizeRecordIdString(item.expectedRoomId ?? "") ===
        normalizeRecordIdString(audit.roomId ?? "");
    const statement = isExpectedForRoom
      ? "UPDATE $itemId SET resultStatus = 'pending', actualRoomId = NONE, actualCondition = NONE, note = NONE, checkedBy = NONE, checkedAt = NONE, updatedAt = $time;"
      : "DELETE $itemId;";
    await db.query(
      `BEGIN TRANSACTION; ${statement} UPDATE $audit MERGE { updatedAt: $time }; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;`,
      {
        itemId: parsed.auditItemId,
        audit: parsed.auditId,
        time: timestamp,
        log: {
          actorId: user.id,
          action: "audit.item_removed",
          entityType: "audit",
          entityId: auditText,
          createdAt: timestamp,
        },
      },
    );
  });
  revalidatePath("/audits");
}

export async function finishAuditAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "audit:manage");
  const parsed = auditStateSchema.parse(Object.fromEntries(formData));
  const timestamp = new Date().toISOString();
  await withDatabase(async (db) => {
    const auditText = normalizeRecordIdString(parsed.auditId);
    const [audit] = await queryRows<{ status: string }>(
      db,
      "SELECT status FROM audit WHERE id = $id LIMIT 1;",
      { id: parsed.auditId },
    );
    if (!audit) throw new Error("Аудит не знайдено.");
    if (audit.status !== "in_progress")
      throw new Error("Завершити можна лише аудит у роботі.");
    await db.query(
      "UPDATE audit_item SET resultStatus = 'missing', checkedBy = $actor, checkedAt = $time, updatedAt = $time WHERE auditId = $auditId AND (resultStatus = NONE OR resultStatus = 'pending');",
      { auditId: auditText, actor: user.id, time: timestamp },
    );
    const items = await queryRows<{
      resultStatus?: string;
      actualCondition?: string;
    }>(
      db,
      "SELECT resultStatus, actualCondition FROM audit_item WHERE auditId = $auditId;",
      { auditId: auditText },
    );
    const count = (status: string) =>
      items.filter((item) => item.resultStatus === status).length;
    const damaged = items.filter(
      (item) =>
        item.resultStatus === "damaged" ||
        item.actualCondition === "damaged" ||
        item.actualCondition === "unusable",
    ).length;
    const found = count("found") + count("damaged");
    const misplaced = count("misplaced");
    const missing = count("missing");
    const unknown = count("unknown");
    const actualItemCount = found + misplaced + unknown;
    const auditResult = `Знайдено: ${found}; не з цієї аудиторії: ${misplaced}; відсутнє: ${missing}; пошкоджено: ${damaged}; невідомі номери: ${unknown}.`;
    await db.query(
      "BEGIN TRANSACTION; UPDATE $id MERGE { status: 'completed', completedAt: $time, updatedAt: $time, checkedBy: $actor, actualItemCount: $actualItemCount, auditResult: $auditResult }; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
      {
        id: parsed.auditId,
        time: timestamp,
        actor: user.id,
        actualItemCount,
        auditResult,
        log: {
          actorId: user.id,
          action: "audit.completed",
          entityType: "audit",
          entityId: auditText,
          createdAt: timestamp,
        },
      },
    );
  });
  revalidatePath("/audits");
  revalidatePath("/dashboard");
}

export async function createWriteoffAction(
  _: WorkflowActionState,
  formData: FormData,
): Promise<WorkflowActionState> {
  const user = await getCurrentUser();
  if (!user) return { formError: "Сеанс завершено." };
  try {
    assertPermission(user, "writeoff:propose");
  } catch (error) {
    return initialError(error, formData);
  }
  const parsed = writeoffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const timestamp = new Date().toISOString();
  try {
    await withDatabase(async (db) => {
      const [instance] = await queryRows<{ status?: string }>(
        db,
        "SELECT status FROM equipment_instance WHERE id = $id LIMIT 1;",
        { id: toRecordId(parsed.data.equipmentId) },
      );
      if (!instance) throw new Error("Екземпляр обладнання не знайдено.");
      if (instance.status === "written_off")
        throw new Error("Цей екземпляр уже списано.");
      const [activeRequest] = await queryRows<{ id: unknown }>(
        db,
        "SELECT id FROM writeoff_request WHERE equipmentId = $equipmentId AND (status = 'proposed' OR status = 'approved') LIMIT 1;",
        { equipmentId: parsed.data.equipmentId },
      );
      if (activeRequest)
        throw new Error(
          "Для цього екземпляра вже є активна пропозиція списання.",
        );
      await db.query(
        "BEGIN TRANSACTION; CREATE writeoff_request CONTENT $value; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
        {
          value: {
            ...parsed.data,
            status: "proposed",
            proposedBy: user.id,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          log: {
            actorId: user.id,
            action: "writeoff.proposed",
            entityType: "equipment_instance",
            entityId: parsed.data.equipmentId,
            createdAt: timestamp,
          },
        },
      );
    });
  } catch (error) {
    return initialError(error, formData);
  }
  await addNotification(
    "user:admin",
    "Нова пропозиція списання",
    "Потрібне рішення адміністратора щодо списання обладнання.",
  );
  revalidatePath("/writeoffs");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
  return { success: "Пропозицію списання передано адміністратору." };
}

export async function approveWriteoffAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "writeoff:approve");
  const requestId = writeoffRequestId.parse(formData.get("requestId"));
  let proposedBy = "";
  await withDatabase(async (db) => {
    const [request] = await queryRows<{ status?: string; proposedBy?: string }>(
      db,
      "SELECT status, proposedBy FROM writeoff_request WHERE id = $id LIMIT 1;",
      { id: requestId },
    );
    if (!request || request.status !== "proposed")
      throw new Error("Погодити можна лише запропоноване списання.");
    proposedBy = normalizeRecordIdString(request.proposedBy ?? "");
    const timestamp = new Date().toISOString();
    await db.query(
      "BEGIN TRANSACTION; UPDATE $request MERGE { status: 'approved', approvedBy: $actor, approvedAt: $time, updatedAt: $time }; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
      {
        request: requestId,
        actor: user.id,
        time: timestamp,
        log: {
          actorId: user.id,
          action: "writeoff.approved",
          entityType: "writeoff_request",
          entityId: normalizeRecordIdString(requestId),
          createdAt: timestamp,
        },
      },
    );
  });
  if (proposedBy)
    await addNotification(
      proposedBy,
      "Списання погоджено",
      "Адміністратор погодив пропозицію. Після фактичного вилучення підтвердьте завершення списання.",
    );
  revalidatePath("/writeoffs");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function rejectWriteoffAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "writeoff:approve");
  const requestId = writeoffRequestId.parse(formData.get("requestId"));
  let proposedBy = "";
  await withDatabase(async (db) => {
    const [request] = await queryRows<{ status?: string; proposedBy?: string }>(
      db,
      "SELECT status, proposedBy FROM writeoff_request WHERE id = $id LIMIT 1;",
      { id: requestId },
    );
    if (!request || request.status !== "proposed")
      throw new Error("Відхилити можна лише запропоноване списання.");
    proposedBy = normalizeRecordIdString(request.proposedBy ?? "");
    const timestamp = new Date().toISOString();
    await db.query(
      "BEGIN TRANSACTION; UPDATE $request MERGE { status: 'rejected', rejectedBy: $actor, rejectedAt: $time, updatedAt: $time }; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
      {
        request: requestId,
        actor: user.id,
        time: timestamp,
        log: {
          actorId: user.id,
          action: "writeoff.rejected",
          entityType: "writeoff_request",
          entityId: normalizeRecordIdString(requestId),
          createdAt: timestamp,
        },
      },
    );
  });
  if (proposedBy)
    await addNotification(
      proposedBy,
      "Списання відхилено",
      "Адміністратор відхилив пропозицію списання. Екземпляр лишається в обліку.",
    );
  revalidatePath("/writeoffs");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function cancelWriteoffAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "writeoff:propose");
  const requestId = writeoffRequestId.parse(formData.get("requestId"));
  await withDatabase(async (db) => {
    const [request] = await queryRows<{ status?: string; proposedBy?: string }>(
      db,
      "SELECT status, proposedBy FROM writeoff_request WHERE id = $id LIMIT 1;",
      { id: requestId },
    );
    if (!request || request.status !== "proposed")
      throw new Error("Скасувати можна лише запропоноване списання.");
    const owner = normalizeRecordIdString(request.proposedBy ?? "");
    if (
      owner !== normalizeRecordIdString(user.id) &&
      !can(user, "writeoff:approve")
    )
      throw new Error("Скасовувати можна лише власну пропозицію.");
    const timestamp = new Date().toISOString();
    await db.query(
      "BEGIN TRANSACTION; UPDATE $request MERGE { status: 'cancelled', cancelledBy: $actor, cancelledAt: $time, updatedAt: $time }; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;",
      {
        request: requestId,
        actor: user.id,
        time: timestamp,
        log: {
          actorId: user.id,
          action: "writeoff.cancelled",
          entityType: "writeoff_request",
          entityId: normalizeRecordIdString(requestId),
          createdAt: timestamp,
        },
      },
    );
  });
  revalidatePath("/writeoffs");
  revalidatePath("/dashboard");
}

export async function completeWriteoffAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  assertPermission(user, "writeoff:propose");
  const requestId = writeoffRequestId.parse(formData.get("requestId"));
  let proposedBy = "";
  await withDatabase(async (db) => {
    const [request] = await queryRows<{
      equipmentId?: string;
      status?: string;
      proposedBy?: string;
      reason?: string;
    }>(
      db,
      "SELECT equipmentId, status, proposedBy, reason FROM writeoff_request WHERE id = $id LIMIT 1;",
      { id: requestId },
    );
    if (!request || request.status !== "approved" || !request.equipmentId)
      throw new Error("Завершити можна лише погоджене списання.");
    const [equipment] = await queryRows<{
      status?: string;
      currentRoomId?: string;
    }>(
      db,
      "SELECT status, currentRoomId FROM equipment_instance WHERE id = $id LIMIT 1;",
      { id: toRecordId(request.equipmentId) },
    );
    if (!equipment) throw new Error("Екземпляр обладнання не знайдено.");
    if (equipment.status === "written_off")
      throw new Error("Цей екземпляр уже списано.");
    proposedBy = normalizeRecordIdString(request.proposedBy ?? "");
    const timestamp = new Date().toISOString();
    const movementId = generated("movement");
    await db.query(
      `BEGIN TRANSACTION;
      UPDATE $equipment MERGE { status: 'written_off', archivedAt: $time, updatedAt: $time };
      UPDATE $request MERGE { status: 'completed', completedBy: $actor, completedAt: $time, updatedAt: $time };
      CREATE ${movementId} CONTENT $movement;
      CREATE audit_log CONTENT $log;
      COMMIT TRANSACTION;`,
      {
        equipment: toRecordId(request.equipmentId),
        request: requestId,
        actor: user.id,
        time: timestamp,
        movement: {
          equipmentId: request.equipmentId,
          movementType: "written_off",
          fromRoomId: equipment.currentRoomId,
          performedBy: user.id,
          movementDate: timestamp,
          reason: request.reason || "Фактичне списання погодженого екземпляра.",
          createdAt: timestamp,
        },
        log: {
          actorId: user.id,
          action: "writeoff.completed",
          entityType: "writeoff_request",
          entityId: normalizeRecordIdString(requestId),
          createdAt: timestamp,
        },
      },
    );
  });
  if (
    proposedBy &&
    normalizeRecordIdString(proposedBy) !== normalizeRecordIdString(user.id)
  )
    await addNotification(
      proposedBy,
      "Списання завершено",
      "Фактичне списання підтверджено, а екземпляр вилучено з активного фонду.",
    );
  revalidatePath("/writeoffs");
  revalidatePath("/equipment");
  revalidatePath("/movements");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}
