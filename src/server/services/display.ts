import type { Surreal } from "surrealdb";
import { normalizeRecordIdString } from "@/lib/db/record-id";
import { batchRows, queryBatch } from "@/lib/db/repository";
import { formatDateTime, label, recordId } from "@/lib/format";

export type DisplayRow = Record<string, unknown> & {
  id: unknown;
  __display?: Record<string, string>;
  __title?: string;
  __subtitle?: string;
  __search?: string;
};

export type FileAttachment = Record<string, unknown> & {
  id: unknown;
  name?: string;
  mimeType?: string;
  size?: number;
  kind?: string;
  entityType?: string;
  entityId?: string;
  targetLabel?: string;
  targetHref?: string;
  targetTypeLabel?: string;
};

type EquipmentModelLookup = { id: unknown; name?: string; manufacturer?: string; model?: string };
type EquipmentLookup = { id: unknown; equipmentId?: string; name?: string; inventoryNumber?: string; serialNumber?: string; currentRoomId?: string };
type RoomLookup = { id: unknown; number?: string; name?: string; buildingId?: string };
type BuildingLookup = { id: unknown; name?: string };
type UserLookup = { id: unknown; fullName?: string; position?: string; role?: string };
type AuditItemLookup = {
  auditId?: string;
  equipmentId?: string;
  scannedCode?: string;
  resultStatus?: string;
  expectedRoomId?: string;
  actualRoomId?: string;
  expectedSerialNumber?: string;
  expectedInventoryNumber?: string;
  actualCondition?: string;
  expectedCondition?: string;
  note?: string;
  checkedAt?: string;
};
type AuditLookup = { id: unknown; title?: string; roomId?: string; status?: string };

type LookupSet = {
  equipment: Map<string, EquipmentLookup>;
  rooms: Map<string, RoomLookup>;
  buildings: Map<string, BuildingLookup>;
  users: Map<string, UserLookup>;
  audits: Map<string, AuditLookup>;
  auditItems: Map<string, AuditItemLookup[]>;
};

const idKey = (value: unknown) => {
  if (value == null || value === "") return "";
  return normalizeRecordIdString(recordId(value));
};

const byId = <T extends { id: unknown }>(rows: T[]) => new Map(rows.map((row) => [idKey(row.id), row]));

export async function getLookupSet(db: Surreal): Promise<LookupSet> {
  const result = await queryBatch(db, `
    SELECT id, name, manufacturer, model FROM equipment;
    SELECT id, equipmentId, inventoryNumber, serialNumber, currentRoomId FROM equipment_instance;
    SELECT id, number, name, buildingId FROM room;
    SELECT id, name FROM building;
    SELECT id, fullName, position, role FROM user;
    SELECT id, title, roomId, status FROM audit;
    SELECT auditId, equipmentId, scannedCode, resultStatus, expectedRoomId, actualRoomId, expectedSerialNumber, expectedInventoryNumber, actualCondition, expectedCondition, note, checkedAt FROM audit_item;
  `);
  const equipmentModels = batchRows<EquipmentModelLookup>(result, 0);
  const equipmentInstances = batchRows<EquipmentLookup>(result, 1);
  const rooms = batchRows<RoomLookup>(result, 2);
  const buildings = batchRows<BuildingLookup>(result, 3);
  const users = batchRows<UserLookup>(result, 4);
  const audits = batchRows<AuditLookup>(result, 5);
  const auditItems = batchRows<AuditItemLookup>(result, 6);
  const itemsByAudit = new Map<string, AuditItemLookup[]>();
  for (const item of auditItems) {
    const key = idKey(item.auditId);
    if (!key) continue;
    const bucket = itemsByAudit.get(key) ?? [];
    bucket.push(item);
    itemsByAudit.set(key, bucket);
  }
  const modelMap = byId(equipmentModels);
  const equipment = new Map<string, EquipmentLookup>();
  for (const model of equipmentModels) equipment.set(idKey(model.id), { id: model.id, name: model.name });
  for (const instance of equipmentInstances) {
    const model = modelMap.get(idKey(instance.equipmentId));
    equipment.set(idKey(instance.id), { ...instance, name: model?.name });
  }
  return { equipment, rooms: byId(rooms), buildings: byId(buildings), users: byId(users), audits: byId(audits), auditItems: itemsByAudit };
}

export function describeRoom(id: unknown, lookup: LookupSet) {
  const room = lookup.rooms.get(idKey(id));
  if (!room) return id ? `Приміщення ${recordId(id)}` : "Приміщення не вказано";
  const building = room.buildingId ? lookup.buildings.get(idKey(room.buildingId)) : undefined;
  return [room.number, room.name, building?.name].filter(Boolean).join(" · ");
}

export function describeEquipment(id: unknown, lookup: LookupSet) {
  const item = lookup.equipment.get(idKey(id));
  if (!item) return id ? `Обладнання ${recordId(id)}` : "Обладнання не вказано";
  return [item.name, item.inventoryNumber, item.serialNumber].filter(Boolean).join(" · ");
}

export function describeUser(id: unknown, lookup: LookupSet) {
  const user = lookup.users.get(idKey(id));
  if (!user) return id ? `Користувач ${recordId(id)}` : "Користувача не вказано";
  return user.position ? `${user.fullName} · ${user.position}` : String(user.fullName ?? "Користувач");
}

function describeAudit(id: unknown, lookup: LookupSet) {
  const audit = lookup.audits.get(idKey(id));
  if (!audit) return id ? `Аудит ${recordId(id)}` : "Аудит не вказано";
  const room = audit.roomId ? describeRoom(audit.roomId, lookup) : "";
  return [audit.title, room].filter(Boolean).join(" · ");
}

function describeEntity(type: unknown, id: unknown, lookup: LookupSet) {
  const entityType = String(type ?? "");
  if (entityType === "equipment" || entityType === "equipment_instance") return describeEquipment(id, lookup);
  if (entityType === "room") return describeRoom(id, lookup);
  if (entityType === "audit") return describeAudit(id, lookup);
  if (entityType === "transfer_request") return `Заявка ${recordId(id)}`;
  if (entityType === "writeoff_request") return `Списання ${recordId(id)}`;
  if (entityType === "repair") return `Ремонт ${recordId(id)}`;
  return id ? recordId(id) : "Запис не вказано";
}

function auditSummary(row: DisplayRow, lookup: LookupSet) {
  const items = lookup.auditItems.get(idKey(row.id)) ?? [];
  if (!items.length) {
    return {
      actualCount: 0,
      expectedRegisteredCount: 0,
      counted: "Очікуваний перелік обладнання ще не сформовано.",
      result: "Підсумок інвентаризації відсутній.",
    };
  }
  const expectedRegisteredCount = items.filter((item) => item.equipmentId && item.resultStatus !== "unknown").length;
  const pending = items.filter((item) => !item.resultStatus || item.resultStatus === "pending").length;
  const found = items.filter((item) => item.resultStatus === "found").length;
  const misplaced = items.filter((item) => item.resultStatus === "misplaced").length;
  const unknown = items.filter((item) => item.resultStatus === "unknown").length;
  const damaged = items.filter((item) => item.resultStatus === "damaged" || item.actualCondition === "damaged" || item.actualCondition === "unusable").length;
  const missing = items.filter((item) => item.resultStatus === "missing").length;
  const actualCount = found + misplaced + unknown + damaged;
  const problemItems = items.filter((item) => ["misplaced", "missing", "unknown", "damaged"].includes(String(item.resultStatus ?? "")) || item.actualCondition === "damaged" || item.actualCondition === "unusable");
  const preview = items.slice(0, 7).map((item) => {
    const equipment = item.equipmentId ? describeEquipment(item.equipmentId, lookup) : `Невідомий номер ${item.scannedCode ?? "—"}`;
    const serial = item.expectedSerialNumber ? `серійний ${item.expectedSerialNumber}` : item.scannedCode ? `введено ${item.scannedCode}` : "";
    const status = label(item.resultStatus ?? "pending", String(item.resultStatus ?? "pending"));
    const location = item.resultStatus === "misplaced"
      ? `має бути: ${describeRoom(item.expectedRoomId, lookup)}; знайдено: ${describeRoom(item.actualRoomId, lookup)}`
      : "";
    return [equipment, serial, status, location].filter(Boolean).join(" · ");
  }).join("; ");
  const problems = problemItems.slice(0, 10).map((item) => {
    const equipment = item.equipmentId ? describeEquipment(item.equipmentId, lookup) : `Невідомий номер ${item.scannedCode ?? "—"}`;
    const status = label(item.resultStatus ?? "pending", String(item.resultStatus ?? "pending"));
    const condition = item.actualCondition ? `стан: ${label(item.actualCondition, String(item.actualCondition))}` : "";
    const location = item.resultStatus === "misplaced"
      ? `має бути: ${describeRoom(item.expectedRoomId, lookup)}; знайдено: ${describeRoom(item.actualRoomId, lookup)}`
      : "";
    return [equipment, status, condition, location, item.note].filter(Boolean).join(" · ");
  }).join("; ");
  return {
    actualCount,
    expectedRegisteredCount,
    counted: `Очікувано за обліком ${expectedRegisteredCount} позицій${preview ? `: ${preview}${items.length > 7 ? "…" : ""}` : "."}`,
    result: `Знайдено: ${found + damaged}; не з цієї аудиторії: ${misplaced}; відсутнє: ${missing}; пошкоджено: ${damaged}; невідомі номери: ${unknown}; очікує перевірки: ${pending}.`,
    problems: problems ? `Проблемні позиції (${problemItems.length}): ${problems}${problemItems.length > 10 ? "…" : ""}` : "Розбіжностей не зафіксовано.",
  };
}

function auditCountDelta(expected: unknown, actual: number) {
  if (expected == null || expected === "") return "Очікувану кількість не вказано.";
  const expectedCount = Number(expected);
  if (!Number.isFinite(expectedCount)) return "Очікувану кількість не вказано.";
  const delta = actual - expectedCount;
  if (delta === 0) return "Кількість збігається.";
  if (delta > 0) return `Фактично на ${delta} позицій більше.`;
  return `Фактично на ${Math.abs(delta)} позицій менше.`;
}

function decorateRow(row: DisplayRow, lookup: LookupSet, kind?: string): DisplayRow {
  const display: Record<string, string> = {};
  const set = (key: string, value: string) => { if (row[key] != null && row[key] !== "") display[key] = value; };

  set("equipmentId", describeEquipment(row.equipmentId, lookup));
  set("fromRoomId", describeRoom(row.fromRoomId, lookup));
  set("toRoomId", describeRoom(row.toRoomId, lookup));
  set("roomId", describeRoom(row.roomId, lookup));
  set("expectedRoomId", describeRoom(row.expectedRoomId, lookup));
  set("actualRoomId", describeRoom(row.actualRoomId, lookup));
  set("userId", describeUser(row.userId, lookup));
  set("actorId", describeUser(row.actorId, lookup));
  set("acceptedBy", describeUser(row.acceptedBy, lookup));
  set("performedBy", describeUser(row.performedBy, lookup));
  set("requestedBy", describeUser(row.requestedBy, lookup));
  set("reportedBy", describeUser(row.reportedBy, lookup));
  set("proposedBy", describeUser(row.proposedBy, lookup));
  set("approvedBy", describeUser(row.approvedBy, lookup));
  set("rejectedBy", describeUser(row.rejectedBy, lookup));
  set("handledBy", describeUser(row.handledBy, lookup));
  set("completedBy", describeUser(row.completedBy, lookup));
  set("createdBy", describeUser(row.createdBy, lookup));
  set("checkedBy", describeUser(row.checkedBy, lookup));
  set("toResponsibleId", describeUser(row.toResponsibleId, lookup));
  set("entityId", describeEntity(row.entityType, row.entityId, lookup));
  if (row.severity) display.severity = label(row.severity, String(row.severity));
  if (row.type) display.type = label(row.type, String(row.type));
  if (row.action) display.action = label(row.action, String(row.action));
  if (row.status) display.status = label(row.status, String(row.status));
  if (row.movementType) display.movementType = label(row.movementType, String(row.movementType));

  if (kind === "audits") {
    const summary = auditSummary(row, lookup);
    row.auditScope = row.auditScope || summary.counted;
    row.expectedRegisteredCount = summary.expectedRegisteredCount;
    row.actualItemCount = summary.actualCount;
    row.itemCountDelta = auditCountDelta(row.expectedItemCount, Number(row.actualItemCount ?? summary.actualCount));
    row.auditItemPreview = summary.counted;
    row.auditResult = row.auditResult || summary.result;
    row.auditProblems = summary.problems;
  }
  if (kind === "movements" || row.movementType) row.quantity = "1 одиниця";

  const equipment = display.equipmentId;
  const from = display.fromRoomId;
  const to = display.toRoomId;
  const room = display.roomId;
  const status = row.status ? label(row.status, String(row.status)) : "";
  const movement = row.movementType ? label(row.movementType, String(row.movementType)) : "";

  if (kind === "movements" || row.movementType) {
    row.__title = equipment ? `${movement || "Рух"} · ${equipment}` : movement || "Рух обладнання";
    row.__subtitle = [from && `з ${from}`, to && `до ${to}`, row.reason && String(row.reason)].filter(Boolean).join(" · ");
  } else if (kind === "requests") {
    row.__title = equipment ? `Заявка: ${equipment}` : String(row.reason ?? "Заявка на передачу");
    row.__subtitle = [from && `з ${from}`, to && `до ${to}`, status].filter(Boolean).join(" · ");
  } else if (kind === "repairs") {
    row.__title = equipment ? `Ремонт: ${equipment}` : String(row.issueDescription ?? "Повідомлення про ремонт");
    row.__subtitle = [row.issueDescription && String(row.issueDescription), row.severity && `Серйозність: ${label(row.severity, String(row.severity))}`, status].filter(Boolean).join(" · ");
  } else if (kind === "audits") {
    row.__title = String(row.title ?? "Інвентаризація");
    row.__subtitle = [room, status, row.auditResult && String(row.auditResult)].filter(Boolean).join(" · ");
  } else if (kind === "writeoffs") {
    row.__title = equipment ? `Списання: ${equipment}` : String(row.reason ?? "Пропозиція списання");
    row.__subtitle = [row.reason && String(row.reason), status].filter(Boolean).join(" · ");
  } else if (kind === "notifications") {
    row.__title = String(row.title ?? "Сповіщення");
    row.__subtitle = [row.body && String(row.body), display.userId && `для ${display.userId}`].filter(Boolean).join(" · ");
  } else if (kind === "auditLog") {
    row.__title = [row.action && label(row.action, String(row.action)), display.entityId].filter(Boolean).join(" · ") || "Запис журналу";
    row.__subtitle = [display.actorId && `виконав ${display.actorId}`, row.createdAt && formatDateTime(row.createdAt)].filter(Boolean).join(" · ");
  }

  row.__display = display;
  row.__search = Object.values({ ...row, ...display }).filter((value) => typeof value !== "object").join(" ").toLowerCase();
  return row;
}

export async function enrichWorkflowRows(db: Surreal, rows: DisplayRow[], kind?: string) {
  const lookup = await getLookupSet(db);
  return rows.map((row) => decorateRow({ ...row }, lookup, kind));
}

export async function enrichFiles(db: Surreal, files: FileAttachment[]) {
  const lookup = await getLookupSet(db);
  return files.map((file) => {
    const entityType = String(file.entityType ?? "");
    const entityId = file.entityId;
    const targetLabel = describeEntity(entityType, entityId, lookup);
    const normalizedId = entityId ? normalizeRecordIdString(String(entityId)) : "";
    const targetHref = entityType === "equipment"
      ? `/equipment/${encodeURIComponent(normalizedId)}`
      : entityType === "room"
        ? `/rooms/${encodeURIComponent(normalizedId)}`
        : undefined;
    const targetTypeLabel = entityType === "equipment" ? "Обладнання" : entityType === "room" ? "Приміщення" : entityType === "category" ? "Категорія" : "Запис";
    return { ...file, targetLabel, targetHref, targetTypeLabel };
  });
}
