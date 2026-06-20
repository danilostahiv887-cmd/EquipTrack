"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { queryRows } from "@/lib/db/repository";

export type WorkflowActionState = { formError?: string; fieldErrors?: Record<string, string>; success?: string };
const initialError = (error: unknown) => ({ formError: error instanceof Error ? error.message : "Операцію не виконано." });
const generated = (table: string) => `${table}:${randomUUID().replaceAll("-", "")}`;
const equipmentId = z.string().regex(/^equipment:[A-Za-z0-9]+$/, "Некоректне обладнання.");
const roomId = z.string().regex(/^room:[A-Za-z0-9-]+$/, "Некоректне приміщення.");
const transferSchema = z.object({ equipmentId, fromRoomId: roomId, toRoomId: roomId, reason: z.string().trim().min(4, "Опишіть причину передачі.") });
const repairSchema = z.object({ equipmentId, roomId, issueDescription: z.string().trim().min(6, "Опишіть несправність."), severity: z.enum(["low", "medium", "high"]) });
const auditSchema = z.object({ title: z.string().trim().min(4, "Вкажіть назву аудиту."), roomId, plannedDate: z.string().min(1, "Вкажіть заплановану дату.") });
const writeoffSchema = z.object({ equipmentId, reason: z.string().trim().min(6, "Вкажіть обґрунтування списання.") });
const requestId = z.string().regex(/^transfer_request:[A-Za-z0-9-]+$/, "Некоректна заявка.");

function fieldErrors(error: z.ZodError) { return { fieldErrors: Object.fromEntries(Object.entries(error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Некоректне значення."])) }; }

async function addNotification(userId: string, title: string, body: string) {
  await withDatabase((db) => db.query("CREATE notification CONTENT $value;", { value: { userId, type: "system", title, body, isRead: false, createdAt: new Date().toISOString() } }));
}

export async function createTransferRequestAction(_: WorkflowActionState, formData: FormData): Promise<WorkflowActionState> {
  const user = await getCurrentUser(); if (!user) return { formError: "Сеанс завершено." };
  try { assertPermission(user, "request:create"); } catch (error) { return initialError(error); }
  const parsed = transferSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return fieldErrors(parsed.error);
  const timestamp = new Date().toISOString();
  await withDatabase((db) => db.query("CREATE transfer_request CONTENT $value;", { value: { ...parsed.data, requestedBy: user.id, status: "submitted", createdAt: timestamp, updatedAt: timestamp } }));
  await addNotification("user:manager-1", "Нова заявка на передачу", "Перегляньте нову заявку на переміщення обладнання.");
  revalidatePath("/requests"); revalidatePath("/dashboard"); return { success: "Заявку подано на розгляд." };
}

export async function createRepairAction(_: WorkflowActionState, formData: FormData): Promise<WorkflowActionState> {
  const user = await getCurrentUser(); if (!user) return { formError: "Сеанс завершено." };
  try { assertPermission(user, "repair:report"); } catch (error) { return initialError(error); }
  const parsed = repairSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return fieldErrors(parsed.error);
  const timestamp = new Date().toISOString();
  await withDatabase((db) => db.query("CREATE repair CONTENT $value;", { value: { ...parsed.data, reportedBy: user.id, status: "reported", createdAt: timestamp, updatedAt: timestamp } }));
  await addNotification("user:manager-1", "Повідомлення про несправність", "Надійшло нове повідомлення про ремонт.");
  revalidatePath("/repairs"); revalidatePath("/dashboard"); return { success: "Повідомлення про несправність зареєстровано." };
}

export async function decideTransferRequestAction(formData: FormData) {
  const user = await getCurrentUser(); if (!user) return;
  assertPermission(user, "request:manage");
  const id = requestId.parse(formData.get("requestId"));
  const decision = z.enum(["approved", "rejected"]).parse(formData.get("decision"));
  await withDatabase(async (db) => {
    const [request] = await queryRows<{ requestedBy: string }>(db, "SELECT requestedBy FROM transfer_request WHERE id = $id LIMIT 1;", { id });
    if (!request) throw new Error("Заявку не знайдено.");
    if (request.requestedBy === user.id) throw new Error("Не можна погодити власну заявку.");
    await db.query("UPDATE $id MERGE { status: $status, approvedBy: $actor, updatedAt: $time };", { id, status: decision, actor: user.id, time: new Date().toISOString() });
    await db.query("CREATE notification CONTENT $value;", { value: { userId: request.requestedBy, type: "transfer_request", title: decision === "approved" ? "Заявку погоджено" : "Заявку відхилено", body: decision === "approved" ? "Менеджер погодив передачу обладнання." : "Менеджер відхилив передачу обладнання.", isRead: false, createdAt: new Date().toISOString() } });
  });
  revalidatePath("/requests");
}

export async function completeTransferRequestAction(formData: FormData) {
  const user = await getCurrentUser(); if (!user) return;
  assertPermission(user, "request:manage");
  const id = requestId.parse(formData.get("requestId"));
  await withDatabase(async (db) => {
    const [request] = await queryRows<{ equipmentId: string; fromRoomId: string; toRoomId: string; requestedBy: string; reason: string; status: string }>(db, "SELECT * FROM transfer_request WHERE id = $id LIMIT 1;", { id });
    if (!request || request.status !== "approved") throw new Error("Погоджену заявку не знайдено.");
    equipmentId.parse(request.equipmentId); roomId.parse(request.toRoomId);
    const timestamp = new Date().toISOString(); const movementId = generated("movement");
    await db.query(`BEGIN TRANSACTION; UPDATE $equipment MERGE { currentRoomId: $room, status: 'active', updatedAt: $time }; UPDATE $request MERGE { status: 'completed', completedBy: $actor, updatedAt: $time }; CREATE ${movementId} CONTENT $movement; CREATE audit_log CONTENT $log; COMMIT TRANSACTION;`, { equipment: request.equipmentId, request: id, room: request.toRoomId, actor: user.id, time: timestamp, movement: { equipmentId: request.equipmentId, movementType: "transferred", fromRoomId: request.fromRoomId, toRoomId: request.toRoomId, performedBy: user.id, movementDate: timestamp, reason: request.reason, createdAt: timestamp }, log: { actorId: user.id, action: "transfer.completed", entityType: "transfer_request", entityId: id, createdAt: timestamp } });
  });
  revalidatePath("/requests"); revalidatePath("/movements"); revalidatePath("/equipment"); revalidatePath("/dashboard");
}

export async function createAuditAction(_: WorkflowActionState, formData: FormData): Promise<WorkflowActionState> {
  const user = await getCurrentUser(); if (!user) return { formError: "Сеанс завершено." };
  try { assertPermission(user, "audit:manage"); } catch (error) { return initialError(error); }
  const parsed = auditSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return fieldErrors(parsed.error);
  const timestamp = new Date().toISOString(); const auditId = generated("audit");
  await withDatabase(async (db) => {
    const assets = await queryRows<{ id: unknown; currentRoomId: string; condition: string }>(db, "SELECT id, currentRoomId, condition FROM equipment WHERE currentRoomId = $roomId;", { roomId: parsed.data.roomId });
    await db.query(`BEGIN TRANSACTION; CREATE ${auditId} CONTENT $audit; ${assets.map((_, index) => `CREATE audit_item:item${index}${auditId.replace("audit:", "")} CONTENT $item${index};`).join(" ")} COMMIT TRANSACTION;`, { audit: { ...parsed.data, status: "planned", createdBy: user.id, createdAt: timestamp, updatedAt: timestamp }, ...Object.fromEntries(assets.map((asset, index) => [`item${index}`, { auditId, equipmentId: String(asset.id), expectedRoomId: asset.currentRoomId, expectedCondition: asset.condition, createdAt: timestamp }])) });
  });
  revalidatePath("/audits"); return { success: "Аудит створено." };
}

export async function createWriteoffAction(_: WorkflowActionState, formData: FormData): Promise<WorkflowActionState> {
  const user = await getCurrentUser(); if (!user) return { formError: "Сеанс завершено." };
  try { assertPermission(user, "writeoff:propose"); } catch (error) { return initialError(error); }
  const parsed = writeoffSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return fieldErrors(parsed.error);
  const timestamp = new Date().toISOString();
  await withDatabase((db) => db.query("CREATE writeoff_request CONTENT $value;", { value: { ...parsed.data, status: "proposed", proposedBy: user.id, createdAt: timestamp } }));
  await addNotification("user:admin", "Нова пропозиція списання", "Потрібне рішення адміністратора щодо списання обладнання.");
  revalidatePath("/writeoffs"); return { success: "Пропозицію списання передано адміністратору." };
}

export async function approveWriteoffAction(formData: FormData) {
  const user = await getCurrentUser(); if (!user) return;
  assertPermission(user, "writeoff:approve");
  const requestId = z.string().regex(/^writeoff_request:[A-Za-z0-9]+$/).parse(formData.get("requestId"));
  await withDatabase(async (db) => {
    const [request] = await queryRows<{ equipmentId: string }>(db, "SELECT equipmentId FROM writeoff_request WHERE id = $id LIMIT 1;", { id: requestId });
    if (!request) throw new Error("Запит на списання не знайдено.");
    const timestamp = new Date().toISOString(); const movementId = generated("movement");
    await db.query(`BEGIN TRANSACTION; UPDATE $equipment MERGE { status: 'written_off', archivedAt: $time }; UPDATE $request MERGE { status: 'approved', approvedBy: $actor, completedAt: $time }; CREATE ${movementId} CONTENT $movement; COMMIT TRANSACTION;`, { equipment: request.equipmentId, request: requestId, time: timestamp, actor: user.id, movement: { equipmentId: request.equipmentId, movementType: "written_off", performedBy: user.id, movementDate: timestamp, reason: "Списання погоджено", createdAt: timestamp } });
  });
  revalidatePath("/writeoffs"); revalidatePath("/equipment"); revalidatePath("/dashboard");
}
