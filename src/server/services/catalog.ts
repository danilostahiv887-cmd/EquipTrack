import { withDatabase } from "@/lib/db/client";
import { normalizeRecordIdString, toRecordId } from "@/lib/db/record-id";
import { queryRows, type Page } from "@/lib/db/repository";
import { recordId } from "@/lib/format";
import { enrichWorkflowRows } from "@/server/services/display";

export type Room = { id: unknown; number: string; name?: string; buildingId: string; roomTypeId: string; responsibleId?: string; floor: number; capacity: number; status: string; description?: string };
export type EquipmentModel = { id: unknown; name: string; categoryId: string; manufacturer?: string; model?: string; price?: number; acquisitionDate?: string; status: string; condition: string; photoFileId?: string; createdAt: string; updatedAt?: string };
export type EquipmentInstance = {
  id: unknown;
  equipmentId: string;
  inventoryNumber: string;
  serialNumber: string;
  currentRoomId: string;
  currentResponsibleId: string;
  status: string;
  condition: string;
  price?: number;
  acquisitionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  equipmentName?: string;
  manufacturer?: string;
  model?: string;
  categoryId?: string;
  photoFileId?: string;
  roomLabel?: string;
  responsibleLabel?: string;
};
export type Equipment = EquipmentModel & {
  instanceCount: number;
  activeCount: number;
  repairCount: number;
  writtenOffCount: number;
  totalValue: number;
  roomsSummary: string;
  inventoryPreview: string;
  serialPreview: string;
  instances: EquipmentInstance[];
};
export type Reference = { id: unknown; name: string; number?: string; fullName?: string };
export type MovementReferences = {
  equipment: Array<Pick<EquipmentInstance, "id" | "equipmentId" | "equipmentName" | "inventoryNumber" | "serialNumber" | "currentRoomId" | "roomLabel" | "condition" | "status">>;
  rooms: Array<Pick<Room, "id" | "number" | "name">>;
};
type AttachedFile = { id: unknown; name?: string; mimeType?: string; size?: number; kind?: string; createdAt?: string };
type WorkflowRow = Record<string, unknown> & { id: unknown };
export type RoomFilters = { q?: string; status?: string; buildingId?: string; typeId?: string };
export type EquipmentFilters = { q?: string; status?: string; condition?: string; categoryId?: string; roomId?: string };

const idKey = (value: unknown) => normalizeRecordIdString(recordId(value));
const compact = (values: Array<string | undefined>) => values.filter(Boolean).join(" · ");
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

function roomLabel(room?: Pick<Room, "number" | "name">) {
  return room ? compact([room.number, room.name]) : "";
}

function withInstanceLabels(instances: EquipmentInstance[], models: EquipmentModel[], rooms: Array<Pick<Room, "id" | "number" | "name">>, users: Reference[]) {
  const modelsById = new Map(models.map((item) => [idKey(item.id), item]));
  const roomsById = new Map(rooms.map((item) => [idKey(item.id), item]));
  const usersById = new Map(users.map((item) => [idKey(item.id), item]));
  return instances.map((item) => {
    const model = modelsById.get(idKey(item.equipmentId));
    const room = roomsById.get(idKey(item.currentRoomId));
    const user = usersById.get(idKey(item.currentResponsibleId));
    return {
      ...item,
      equipmentName: model?.name,
      manufacturer: model?.manufacturer,
      model: model?.model,
      categoryId: model?.categoryId,
      photoFileId: model?.photoFileId,
      roomLabel: roomLabel(room),
      responsibleLabel: user?.fullName,
    };
  });
}

function aggregateEquipment(models: EquipmentModel[], instances: EquipmentInstance[]) {
  const buckets = new Map<string, EquipmentInstance[]>();
  for (const instance of instances) {
    const key = idKey(instance.equipmentId);
    buckets.set(key, [...(buckets.get(key) ?? []), instance]);
  }
  return models.map((model) => {
    const modelId = idKey(model.id);
    const rows = buckets.get(modelId) ?? [];
    const conditionPriority = ["unusable", "damaged", "needs_repair", "satisfactory", "good", "new"];
    const primaryCondition = conditionPriority.find((condition) => rows.some((item) => item.condition === condition)) ?? model.condition ?? "good";
    const statusPriority = ["written_off", "lost", "in_repair", "in_storage", "active"];
    const primaryStatus = statusPriority.find((status) => rows.some((item) => item.status === status)) ?? model.status ?? "active";
    return {
      ...model,
      condition: primaryCondition,
      status: primaryStatus,
      instanceCount: rows.length,
      activeCount: rows.filter((item) => item.status === "active").length,
      repairCount: rows.filter((item) => item.status === "in_repair" || item.condition === "needs_repair" || item.condition === "damaged").length,
      writtenOffCount: rows.filter((item) => item.status === "written_off").length,
      totalValue: rows.reduce((sum, item) => sum + Number(item.price ?? model.price ?? 0), 0),
      roomsSummary: unique(rows.map((item) => item.roomLabel ?? "")).slice(0, 3).join("; ") || "Екземпляри ще не додано",
      inventoryPreview: unique(rows.map((item) => item.inventoryNumber)).slice(0, 3).join("; "),
      serialPreview: unique(rows.map((item) => item.serialNumber)).slice(0, 3).join("; "),
      instances: rows,
    };
  });
}

export async function getRooms(page: number, filters?: string | RoomFilters): Promise<Page<Room>> {
  return withDatabase(async (db) => {
    const pageSize = 12;
    const safePage = Math.max(1, page);
    const options = typeof filters === "string" ? { q: filters } : filters ?? {};
    const rows = await queryRows<Room>(db, "SELECT * FROM room ORDER BY number;");
    const needle = options.q?.trim().toLowerCase();
    const filtered = rows.filter((room) => {
      if (needle && ![room.number, room.name, room.description].filter(Boolean).join(" ").toLowerCase().includes(needle)) return false;
      if (options.status && room.status !== options.status) return false;
      if (options.buildingId && normalizeRecordIdString(room.buildingId) !== normalizeRecordIdString(options.buildingId)) return false;
      if (options.typeId && normalizeRecordIdString(room.roomTypeId) !== normalizeRecordIdString(options.typeId)) return false;
      return true;
    });
    return { items: filtered.slice((safePage - 1) * pageSize, safePage * pageSize), total: filtered.length, page: safePage, pageSize };
  });
}

export async function getEquipment(page: number, filters?: string | EquipmentFilters): Promise<Page<Equipment>> {
  return withDatabase(async (db) => {
    const pageSize = 12;
    const safePage = Math.max(1, page);
    const options = typeof filters === "string" ? { q: filters } : filters ?? {};
    const [models, rawInstances, rooms, users] = await Promise.all([
      queryRows<EquipmentModel>(db, "SELECT * FROM equipment ORDER BY name;"),
      queryRows<EquipmentInstance>(db, "SELECT * FROM equipment_instance ORDER BY inventoryNumber;"),
      queryRows<Pick<Room, "id" | "number" | "name">>(db, "SELECT id, number, name FROM room ORDER BY number;"),
      queryRows<Reference>(db, "SELECT id, fullName FROM user ORDER BY fullName;"),
    ]);
    const instances = withInstanceLabels(rawInstances, models, rooms, users);
    const rows = aggregateEquipment(models, instances);
    const needle = options.q?.trim().toLowerCase();
    const filtered = rows.filter((item) => {
      const instanceHaystack = item.instances.map((instance) => [instance.inventoryNumber, instance.serialNumber, instance.roomLabel, instance.responsibleLabel].filter(Boolean).join(" ")).join(" ");
      if (needle && ![item.name, item.manufacturer, item.model, item.inventoryPreview, item.serialPreview, item.roomsSummary, instanceHaystack].filter(Boolean).join(" ").toLowerCase().includes(needle)) return false;
      if (options.status && !item.instances.some((instance) => instance.status === options.status)) return false;
      if (options.condition && !item.instances.some((instance) => instance.condition === options.condition)) return false;
      if (options.categoryId && normalizeRecordIdString(item.categoryId) !== normalizeRecordIdString(options.categoryId)) return false;
      if (options.roomId && !item.instances.some((instance) => normalizeRecordIdString(instance.currentRoomId) === normalizeRecordIdString(options.roomId))) return false;
      return true;
    });
    return { items: filtered.slice((safePage - 1) * pageSize, safePage * pageSize), total: filtered.length, page: safePage, pageSize };
  });
}

export async function getReferences() {
  return withDatabase(async (db) => {
    const [buildings, types, categories, users, rooms] = await Promise.all([
      queryRows<Reference>(db, "SELECT id, name FROM building ORDER BY name;"),
      queryRows<Reference>(db, "SELECT id, name FROM room_type ORDER BY name;"),
      queryRows<Reference>(db, "SELECT id, name FROM category ORDER BY name;"),
      queryRows<Reference>(db, "SELECT id, fullName FROM user WHERE status = 'active' ORDER BY fullName;"),
      queryRows<Reference>(db, "SELECT id, number, name FROM room WHERE status = 'active' ORDER BY number;"),
    ]);
    return { buildings, types, categories, users, rooms };
  });
}

export async function getMovementReferences(): Promise<MovementReferences> {
  return withDatabase(async (db) => {
    const [models, rawInstances, rooms, users] = await Promise.all([
      queryRows<EquipmentModel>(db, "SELECT * FROM equipment ORDER BY name;"),
      queryRows<EquipmentInstance>(db, "SELECT * FROM equipment_instance WHERE status != 'written_off' ORDER BY inventoryNumber;"),
      queryRows<MovementReferences["rooms"][number]>(db, "SELECT id, number, name FROM room WHERE status = 'active' ORDER BY number;"),
      queryRows<Reference>(db, "SELECT id, fullName FROM user WHERE status = 'active' ORDER BY fullName;"),
    ]);
    const equipment = withInstanceLabels(rawInstances, models, rooms, users).sort((left, right) => compact([left.equipmentName, left.inventoryNumber]).localeCompare(compact([right.equipmentName, right.inventoryNumber]), "uk"));
    return { equipment, rooms };
  });
}

export async function getRoomPassport(id: string) {
  return withDatabase(async (db) => {
    const record = toRecordId(id);
    const textId = normalizeRecordIdString(id);
    const [room] = await queryRows<Room>(db, "SELECT * FROM room WHERE id = $id LIMIT 1;", { id: record });
    if (!room) return null;
    const [models, rawInstances, users, movementRows, audits, files] = await Promise.all([
      queryRows<EquipmentModel>(db, "SELECT * FROM equipment ORDER BY name;"),
      queryRows<EquipmentInstance>(db, "SELECT * FROM equipment_instance WHERE currentRoomId = $id ORDER BY inventoryNumber;", { id: textId }),
      queryRows<Reference>(db, "SELECT id, fullName FROM user ORDER BY fullName;"),
      queryRows<WorkflowRow>(db, "SELECT * FROM movement WHERE fromRoomId = $id OR toRoomId = $id ORDER BY movementDate DESC LIMIT 8;", { id: textId }),
      queryRows<Record<string, unknown>>(db, "SELECT * FROM audit WHERE roomId = $id ORDER BY createdAt DESC LIMIT 8;", { id: textId }),
      queryRows<AttachedFile>(db, "SELECT id, name, mimeType, size, kind, createdAt FROM file WHERE entityId = $id ORDER BY createdAt DESC;", { id: textId }),
    ]);
    const equipment = withInstanceLabels(rawInstances, models, [room], users);
    const movements = await enrichWorkflowRows(db, movementRows, "movements");
    return { room, equipment, movements, audits, files };
  });
}

export async function getEquipmentPassport(id: string, instanceQuery?: string) {
  return withDatabase(async (db) => {
    const record = toRecordId(id);
    const textId = normalizeRecordIdString(id);
    const [equipment] = await queryRows<EquipmentModel>(db, "SELECT * FROM equipment WHERE id = $id LIMIT 1;", { id: record });
    if (!equipment) return null;
    const [rawInstances, rooms, users, movementRows, repairs, audits, files] = await Promise.all([
      queryRows<EquipmentInstance>(db, "SELECT * FROM equipment_instance WHERE equipmentId = $id ORDER BY inventoryNumber;", { id: textId }),
      queryRows<Pick<Room, "id" | "number" | "name">>(db, "SELECT id, number, name FROM room ORDER BY number;"),
      queryRows<Reference>(db, "SELECT id, fullName FROM user ORDER BY fullName;"),
      queryRows<WorkflowRow>(db, "SELECT * FROM movement ORDER BY movementDate DESC;"),
      queryRows<Record<string, unknown>>(db, "SELECT * FROM repair ORDER BY createdAt DESC;"),
      queryRows<Record<string, unknown>>(db, "SELECT * FROM audit_item ORDER BY checkedAt DESC;"),
      queryRows<AttachedFile>(db, "SELECT id, name, mimeType, size, kind, createdAt FROM file WHERE entityId = $id ORDER BY createdAt DESC;", { id: textId }),
    ]);
    const instances = withInstanceLabels(rawInstances, [equipment], rooms, users);
    const instanceIds = new Set(instances.map((item) => idKey(item.id)));
    const needle = instanceQuery?.trim().toLowerCase();
    const filteredInstances = needle
      ? instances.filter((item) => [item.equipmentName, item.inventoryNumber, item.serialNumber, item.roomLabel, item.responsibleLabel, item.status, item.condition].filter(Boolean).join(" ").toLowerCase().includes(needle))
      : instances;
    const relatedMovementRows = movementRows.filter((row) => instanceIds.has(idKey(row.equipmentId)));
    const relatedRepairs = repairs.filter((row) => instanceIds.has(idKey(row.equipmentId)));
    const relatedAudits = audits.filter((row) => instanceIds.has(idKey(row.equipmentId)));
    const movements = await enrichWorkflowRows(db, relatedMovementRows, "movements");
    return { equipment, instances, filteredInstances, instanceQuery: instanceQuery ?? "", movements, repairs: relatedRepairs, audits: relatedAudits, files };
  });
}
