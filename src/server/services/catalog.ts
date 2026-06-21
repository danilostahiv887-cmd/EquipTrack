import { withDatabase } from "@/lib/db/client";
import { normalizeRecordIdString, toRecordId } from "@/lib/db/record-id";
import {
  batchRows,
  queryBatch,
  queryRows,
  type Page,
} from "@/lib/db/repository";
import { recordId } from "@/lib/format";
import {
  buildLookupSet,
  enrichWorkflowRowsWithLookup,
} from "@/server/services/display";

export type Room = {
  id: unknown;
  number: string;
  name?: string;
  buildingId: string;
  roomTypeId: string;
  responsibleId?: string;
  floor: number;
  capacity: number;
  status: string;
  description?: string;
};
export type EquipmentModel = {
  id: unknown;
  name: string;
  categoryId: string;
  supplierId?: string | null;
  supplierName?: string;
  manufacturer?: string;
  model?: string;
  price?: number;
  acquisitionDate?: string;
  status: string;
  condition: string;
  photoFileId?: string;
  createdAt: string;
  updatedAt?: string;
};
export type EquipmentInstance = {
  id: unknown;
  equipmentId: string;
  inventoryNumber: string;
  serialNumber: string;
  currentRoomId: string;
  currentResponsibleId: string;
  supplierId?: string | null;
  supplierName?: string;
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
export type EquipmentListItem = Omit<Equipment, "instances">;
export type Reference = {
  id: unknown;
  name: string;
  number?: string;
  fullName?: string;
  type?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  note?: string;
  equipmentCount?: number;
  instanceCount?: number;
  usageCount?: number;
};
export type MovementReferences = {
  equipment: Array<
    Pick<
      EquipmentInstance,
      | "id"
      | "equipmentId"
      | "equipmentName"
      | "inventoryNumber"
      | "serialNumber"
      | "currentRoomId"
      | "roomLabel"
      | "condition"
      | "status"
    >
  >;
  rooms: Array<Pick<Room, "id" | "number" | "name">>;
  auditItems: Array<{
    id: unknown;
    auditId?: string;
    equipmentId?: string;
    scannedCode?: string;
    resultStatus?: string;
    actualCondition?: string;
    note?: string;
    checkedAt?: string;
    expectedRoomId?: string;
    actualRoomId?: string;
    expectedSerialNumber?: string;
    expectedInventoryNumber?: string;
  }>;
};
export type WorkflowFormReferences = Pick<
  MovementReferences,
  "equipment" | "rooms"
>;
export type WriteoffEquipmentOption = Pick<
  EquipmentInstance,
  | "id"
  | "equipmentId"
  | "equipmentName"
  | "inventoryNumber"
  | "serialNumber"
  | "currentRoomId"
  | "condition"
  | "status"
>;
type AttachedFile = {
  id: unknown;
  name?: string;
  mimeType?: string;
  size?: number;
  kind?: string;
  createdAt?: string;
};
type WorkflowRow = Record<string, unknown> & { id: unknown };
export type RoomFilters = {
  q?: string;
  status?: string;
  buildingId?: string;
  typeId?: string;
};
export type EquipmentFilters = {
  q?: string;
  status?: string;
  condition?: string;
  categoryId?: string;
  roomId?: string;
  supplierId?: string;
};

const idKey = (value: unknown) =>
  value == null || value === "" ? "" : normalizeRecordIdString(recordId(value));
const compact = (values: Array<string | undefined>) =>
  values.filter(Boolean).join(" · ");
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

function roomLabel(room?: Pick<Room, "number" | "name">) {
  return room ? compact([room.number, room.name]) : "";
}

function withInstanceLabels(
  instances: EquipmentInstance[],
  models: EquipmentModel[],
  rooms: Array<Pick<Room, "id" | "number" | "name">>,
  users: Reference[],
  suppliers: Reference[] = [],
) {
  const modelsById = new Map(models.map((item) => [idKey(item.id), item]));
  const roomsById = new Map(rooms.map((item) => [idKey(item.id), item]));
  const usersById = new Map(users.map((item) => [idKey(item.id), item]));
  const suppliersById = new Map(
    suppliers.map((item) => [idKey(item.id), item]),
  );
  return instances.map((item) => {
    const model = modelsById.get(idKey(item.equipmentId));
    const room = roomsById.get(idKey(item.currentRoomId));
    const user = usersById.get(idKey(item.currentResponsibleId));
    const supplier =
      suppliersById.get(idKey(item.supplierId)) ??
      suppliersById.get(idKey(model?.supplierId));
    return {
      ...item,
      equipmentName: model?.name,
      manufacturer: model?.manufacturer,
      model: model?.model,
      categoryId: model?.categoryId,
      photoFileId: model?.photoFileId,
      roomLabel: roomLabel(room),
      responsibleLabel: user?.fullName,
      supplierName: supplier?.name,
    };
  });
}

function withModelSupplierLabels(
  models: EquipmentModel[],
  suppliers: Reference[],
) {
  const suppliersById = new Map(
    suppliers.map((item) => [idKey(item.id), item]),
  );
  return models.map((item) => ({
    ...item,
    supplierName: suppliersById.get(idKey(item.supplierId))?.name,
  }));
}

function aggregateEquipment(
  models: EquipmentModel[],
  instances: EquipmentInstance[],
) {
  const buckets = new Map<string, EquipmentInstance[]>();
  for (const instance of instances) {
    const key = idKey(instance.equipmentId);
    buckets.set(key, [...(buckets.get(key) ?? []), instance]);
  }
  return models.map((model) => {
    const modelId = idKey(model.id);
    const rows = buckets.get(modelId) ?? [];
    const conditionPriority = [
      "unusable",
      "damaged",
      "needs_repair",
      "satisfactory",
      "good",
      "new",
    ];
    const primaryCondition =
      conditionPriority.find((condition) =>
        rows.some((item) => item.condition === condition),
      ) ??
      model.condition ??
      "good";
    const statusPriority = [
      "written_off",
      "lost",
      "in_repair",
      "in_storage",
      "active",
    ];
    const primaryStatus =
      statusPriority.find((status) =>
        rows.some((item) => item.status === status),
      ) ??
      model.status ??
      "active";
    return {
      ...model,
      condition: primaryCondition,
      status: primaryStatus,
      instanceCount: rows.length,
      activeCount: rows.filter((item) => item.status === "active").length,
      repairCount: rows.filter(
        (item) =>
          item.status === "in_repair" ||
          item.condition === "needs_repair" ||
          item.condition === "damaged",
      ).length,
      writtenOffCount: rows.filter((item) => item.status === "written_off")
        .length,
      totalValue: rows.reduce(
        (sum, item) => sum + Number(item.price ?? model.price ?? 0),
        0,
      ),
      roomsSummary:
        unique(rows.map((item) => item.roomLabel ?? ""))
          .slice(0, 3)
          .join("; ") || "Екземпляри ще не додано",
      supplierName:
        unique([
          model.supplierName ?? "",
          ...rows.map((item) => item.supplierName ?? ""),
        ])
          .slice(0, 2)
          .join("; ") || undefined,
      inventoryPreview: unique(rows.map((item) => item.inventoryNumber))
        .slice(0, 3)
        .join("; "),
      serialPreview: unique(rows.map((item) => item.serialNumber))
        .slice(0, 3)
        .join("; "),
      instances: rows,
    };
  });
}

export async function getRooms(
  page: number,
  filters?: string | RoomFilters,
): Promise<Page<Room>> {
  return withDatabase(async (db) => {
    const pageSize = 12;
    const safePage = Math.max(1, page);
    const options =
      typeof filters === "string" ? { q: filters } : (filters ?? {});
    const rows = await queryRows<Room>(
      db,
      "SELECT * FROM room ORDER BY number;",
    );
    const needle = options.q?.trim().toLowerCase();
    const filtered = rows.filter((room) => {
      if (
        needle &&
        ![room.number, room.name, room.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
        return false;
      if (options.status && room.status !== options.status) return false;
      if (
        options.buildingId &&
        normalizeRecordIdString(room.buildingId) !==
          normalizeRecordIdString(options.buildingId)
      )
        return false;
      if (
        options.typeId &&
        normalizeRecordIdString(room.roomTypeId) !==
          normalizeRecordIdString(options.typeId)
      )
        return false;
      return true;
    });
    return {
      items: filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
      total: filtered.length,
      page: safePage,
      pageSize,
    };
  });
}

export async function getEquipment(
  page: number,
  filters?: string | EquipmentFilters,
): Promise<Page<EquipmentListItem>> {
  return withDatabase(async (db) => {
    const pageSize = 12;
    const safePage = Math.max(1, page);
    const options =
      typeof filters === "string" ? { q: filters } : (filters ?? {});
    const result = await queryBatch(
      db,
      `
      SELECT * FROM equipment ORDER BY name;
      SELECT * FROM equipment_instance ORDER BY inventoryNumber;
      SELECT id, number, name FROM room ORDER BY number;
      SELECT id, fullName FROM user ORDER BY fullName;
      SELECT id, name, type FROM supplier ORDER BY name;
    `,
    );
    const suppliers = batchRows<Reference>(result, 4);
    const models = withModelSupplierLabels(
      batchRows<EquipmentModel>(result, 0),
      suppliers,
    );
    const rawInstances = batchRows<EquipmentInstance>(result, 1);
    const rooms = batchRows<Pick<Room, "id" | "number" | "name">>(result, 2);
    const users = batchRows<Reference>(result, 3);
    const instances = withInstanceLabels(
      rawInstances,
      models,
      rooms,
      users,
      suppliers,
    );
    const rows = aggregateEquipment(models, instances);
    const needle = options.q?.trim().toLowerCase();
    const filtered = rows.filter((item) => {
      const instanceHaystack = item.instances
        .map((instance) =>
          [
            instance.inventoryNumber,
            instance.serialNumber,
            instance.roomLabel,
            instance.responsibleLabel,
          ]
            .filter(Boolean)
            .join(" "),
        )
        .join(" ");
      if (
        needle &&
        ![
          item.name,
          item.manufacturer,
          item.model,
          item.supplierName,
          item.inventoryPreview,
          item.serialPreview,
          item.roomsSummary,
          instanceHaystack,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
        return false;
      if (
        options.status &&
        !item.instances.some((instance) => instance.status === options.status)
      )
        return false;
      if (
        options.condition &&
        !item.instances.some(
          (instance) => instance.condition === options.condition,
        )
      )
        return false;
      if (
        options.categoryId &&
        normalizeRecordIdString(item.categoryId) !==
          normalizeRecordIdString(options.categoryId)
      )
        return false;
      if (
        options.supplierId &&
        normalizeRecordIdString(item.supplierId) !==
          normalizeRecordIdString(options.supplierId) &&
        !item.instances.some(
          (instance) =>
            normalizeRecordIdString(instance.supplierId) ===
            normalizeRecordIdString(options.supplierId),
        )
      )
        return false;
      if (
        options.roomId &&
        !item.instances.some(
          (instance) =>
            normalizeRecordIdString(instance.currentRoomId) ===
            normalizeRecordIdString(options.roomId),
        )
      )
        return false;
      return true;
    });
    const items = filtered
      .slice((safePage - 1) * pageSize, safePage * pageSize)
      .map(({ instances: _, ...item }) => item);
    return { items, total: filtered.length, page: safePage, pageSize };
  });
}

export async function getReferences() {
  return withDatabase(async (db) => {
    const result = await queryBatch(
      db,
      `
      SELECT id, name FROM building ORDER BY name;
      SELECT id, name FROM room_type ORDER BY name;
      SELECT id, name FROM category ORDER BY name;
      SELECT id, fullName FROM user WHERE status = 'active' ORDER BY fullName;
      SELECT id, number, name FROM room WHERE status = 'active' ORDER BY number;
      SELECT id, name, type, contactPerson, phone, email, note FROM supplier ORDER BY name;
      SELECT supplierId, count() AS total FROM equipment GROUP BY supplierId;
      SELECT supplierId, count() AS total FROM equipment_instance GROUP BY supplierId;
    `,
    );
    const buildings = batchRows<Reference>(result, 0);
    const types = batchRows<Reference>(result, 1);
    const categories = batchRows<Reference>(result, 2);
    const users = batchRows<Reference>(result, 3);
    const rooms = batchRows<Reference>(result, 4);
    const modelUsage = batchRows<{ supplierId?: string; total?: number }>(
      result,
      6,
    );
    const instanceUsage = batchRows<{ supplierId?: string; total?: number }>(
      result,
      7,
    );
    const modelUsageBySupplier = new Map(
      modelUsage.map((item) => [
        idKey(item.supplierId),
        Number(item.total ?? 0),
      ]),
    );
    const instanceUsageBySupplier = new Map(
      instanceUsage.map((item) => [
        idKey(item.supplierId),
        Number(item.total ?? 0),
      ]),
    );
    const suppliers = batchRows<Reference>(result, 5).map((item) => {
      const key = idKey(item.id);
      const equipmentCount = modelUsageBySupplier.get(key) ?? 0;
      const instanceCount = instanceUsageBySupplier.get(key) ?? 0;
      return {
        ...item,
        equipmentCount,
        instanceCount,
        usageCount: equipmentCount + instanceCount,
      };
    });
    return { buildings, types, categories, users, rooms, suppliers };
  });
}

export async function getMovementReferences(): Promise<MovementReferences> {
  return withDatabase(async (db) => {
    const result = await queryBatch(
      db,
      `
      SELECT * FROM equipment ORDER BY name;
      SELECT * FROM equipment_instance WHERE status != 'written_off' ORDER BY inventoryNumber;
      SELECT id, number, name FROM room WHERE status = 'active' ORDER BY number;
      SELECT id, fullName FROM user WHERE status = 'active' ORDER BY fullName;
      SELECT id, auditId, equipmentId, scannedCode, resultStatus, actualCondition, note, checkedAt, expectedRoomId, actualRoomId, expectedSerialNumber, expectedInventoryNumber FROM audit_item ORDER BY checkedAt DESC;
    `,
    );
    const models = batchRows<EquipmentModel>(result, 0);
    const rawInstances = batchRows<EquipmentInstance>(result, 1);
    const rooms = batchRows<MovementReferences["rooms"][number]>(result, 2);
    const users = batchRows<Reference>(result, 3);
    const auditItems = batchRows<MovementReferences["auditItems"][number]>(
      result,
      4,
    );
    const equipment = withInstanceLabels(
      rawInstances,
      models,
      rooms,
      users,
    ).sort((left, right) =>
      compact([left.equipmentName, left.inventoryNumber]).localeCompare(
        compact([right.equipmentName, right.inventoryNumber]),
        "uk",
      ),
    );
    return { equipment, rooms, auditItems };
  });
}

export async function getWorkflowFormReferences(): Promise<WorkflowFormReferences> {
  return withDatabase(async (db) => {
    const result = await queryBatch(
      db,
      `
      SELECT id, name, manufacturer, model FROM equipment ORDER BY name;
      SELECT id, equipmentId, inventoryNumber, serialNumber, currentRoomId, condition, status FROM equipment_instance WHERE status != 'written_off' ORDER BY inventoryNumber;
      SELECT id, number, name FROM room WHERE status = 'active' ORDER BY number;
    `,
    );
    const models = batchRows<EquipmentModel>(result, 0);
    const rawInstances = batchRows<EquipmentInstance>(result, 1);
    const rooms = batchRows<MovementReferences["rooms"][number]>(result, 2);
    const equipment = withInstanceLabels(rawInstances, models, rooms, []).sort(
      (left, right) =>
        compact([left.equipmentName, left.inventoryNumber]).localeCompare(
          compact([right.equipmentName, right.inventoryNumber]),
          "uk",
        ),
    );
    return { equipment, rooms };
  });
}

export async function getAuditFormReferences() {
  return withDatabase(async (db) => {
    const rooms = await queryRows<MovementReferences["rooms"][number]>(
      db,
      "SELECT id, number, name FROM room WHERE status = 'active' ORDER BY number;",
    );
    return { rooms };
  });
}

export async function getAuditScanReferences(
  auditId: string,
): Promise<MovementReferences> {
  return withDatabase(async (db) => {
    const result = await queryBatch(
      db,
      `
      SELECT id, name, manufacturer, model FROM equipment ORDER BY name;
      SELECT id, equipmentId, inventoryNumber, serialNumber, currentRoomId, condition, status FROM equipment_instance WHERE status != 'written_off' ORDER BY inventoryNumber;
      SELECT id, number, name FROM room WHERE status = 'active' ORDER BY number;
      SELECT id, auditId, equipmentId, scannedCode, resultStatus, actualCondition, note, checkedAt, expectedRoomId, actualRoomId, expectedSerialNumber, expectedInventoryNumber FROM audit_item WHERE auditId = $auditId ORDER BY checkedAt DESC;
    `,
      { auditId: normalizeRecordIdString(auditId) },
    );
    const models = batchRows<EquipmentModel>(result, 0);
    const rawInstances = batchRows<EquipmentInstance>(result, 1);
    const rooms = batchRows<MovementReferences["rooms"][number]>(result, 2);
    const auditItems = batchRows<MovementReferences["auditItems"][number]>(
      result,
      3,
    );
    const equipment = withInstanceLabels(rawInstances, models, rooms, []).sort(
      (left, right) =>
        compact([left.equipmentName, left.inventoryNumber]).localeCompare(
          compact([right.equipmentName, right.inventoryNumber]),
          "uk",
        ),
    );
    return { equipment, rooms, auditItems };
  });
}

export async function getWriteoffEquipmentOptions(): Promise<
  WriteoffEquipmentOption[]
> {
  return withDatabase(async (db) => {
    const result = await queryBatch(
      db,
      `
      SELECT id, name, manufacturer, model FROM equipment ORDER BY name;
      SELECT id, equipmentId, inventoryNumber, serialNumber, currentRoomId, condition, status FROM equipment_instance WHERE status != 'written_off' ORDER BY inventoryNumber;
    `,
    );
    const models = batchRows<EquipmentModel>(result, 0);
    const instances = batchRows<EquipmentInstance>(result, 1);
    return withInstanceLabels(instances, models, [], []).map((item) => ({
      id: recordId(item.id),
      equipmentId: item.equipmentId,
      equipmentName: item.equipmentName,
      inventoryNumber: item.inventoryNumber,
      serialNumber: item.serialNumber,
      currentRoomId: item.currentRoomId,
      condition: item.condition,
      status: item.status,
    }));
  });
}

export async function getRoomPassport(id: string) {
  return withDatabase(async (db) => {
    const record = toRecordId(id);
    const textId = normalizeRecordIdString(id);
    const [room] = await queryRows<Room>(
      db,
      "SELECT * FROM room WHERE id = $id LIMIT 1;",
      { id: record },
    );
    if (!room) return null;
    const result = await queryBatch(
      db,
      `
      SELECT * FROM equipment ORDER BY name;
      SELECT * FROM equipment_instance WHERE currentRoomId = $id ORDER BY inventoryNumber;
      SELECT id, fullName FROM user ORDER BY fullName;
      SELECT id, number, name, buildingId FROM room ORDER BY number;
      SELECT id, name FROM building ORDER BY name;
      SELECT * FROM movement WHERE fromRoomId = $id OR toRoomId = $id ORDER BY movementDate DESC LIMIT 8;
      SELECT * FROM audit WHERE roomId = $id ORDER BY createdAt DESC LIMIT 8;
      SELECT id, name, mimeType, size, kind, createdAt FROM file WHERE entityId = $id ORDER BY createdAt DESC;
      SELECT id, name, type FROM supplier ORDER BY name;
    `,
      { id: textId },
    );
    const suppliers = batchRows<Reference>(result, 8);
    const models = withModelSupplierLabels(
      batchRows<EquipmentModel>(result, 0),
      suppliers,
    );
    const rawInstances = batchRows<EquipmentInstance>(result, 1);
    const users = batchRows<Reference>(result, 2);
    const rooms = batchRows<
      Pick<Room, "id" | "number" | "name" | "buildingId">
    >(result, 3);
    const buildings = batchRows<Reference>(result, 4);
    const movementRows = batchRows<WorkflowRow>(result, 5);
    const audits = batchRows<Record<string, unknown>>(result, 6);
    const files = batchRows<AttachedFile>(result, 7);
    const equipment = withInstanceLabels(
      rawInstances,
      models,
      rooms,
      users,
      suppliers,
    );
    const lookup = buildLookupSet({
      equipmentModels: models,
      equipmentInstances: rawInstances,
      rooms,
      buildings,
      users,
    });
    const movements = enrichWorkflowRowsWithLookup(
      movementRows,
      lookup,
      "movements",
    );
    return { room, equipment, movements, audits, files };
  });
}

export async function getEquipmentPassport(id: string, instanceQuery?: string) {
  return withDatabase(async (db) => {
    const record = toRecordId(id);
    const textId = normalizeRecordIdString(id);
    const [equipment] = await queryRows<EquipmentModel>(
      db,
      "SELECT * FROM equipment WHERE id = $id LIMIT 1;",
      { id: record },
    );
    if (!equipment) return null;
    const result = await queryBatch(
      db,
      `
      SELECT * FROM equipment_instance WHERE equipmentId = $id ORDER BY inventoryNumber;
      SELECT id, number, name, buildingId FROM room ORDER BY number;
      SELECT id, fullName FROM user ORDER BY fullName;
      SELECT id, name FROM building ORDER BY name;
      SELECT id, name, mimeType, size, kind, createdAt FROM file WHERE entityId = $id ORDER BY createdAt DESC;
      SELECT id, name, type FROM supplier ORDER BY name;
    `,
      { id: textId },
    );
    const rawInstances = batchRows<EquipmentInstance>(result, 0);
    const rooms = batchRows<
      Pick<Room, "id" | "number" | "name" | "buildingId">
    >(result, 1);
    const users = batchRows<Reference>(result, 2);
    const buildings = batchRows<Reference>(result, 3);
    const files = batchRows<AttachedFile>(result, 4);
    const suppliers = batchRows<Reference>(result, 5);
    const [equipmentWithSupplier] = withModelSupplierLabels(
      [equipment],
      suppliers,
    );
    const instances = withInstanceLabels(
      rawInstances,
      [equipmentWithSupplier],
      rooms,
      users,
      suppliers,
    );
    const instanceIds = new Set(instances.map((item) => idKey(item.id)));
    const relatedResult = instanceIds.size
      ? await queryBatch(
          db,
          `
        SELECT * FROM movement WHERE equipmentId IN $instanceIds ORDER BY movementDate DESC;
        SELECT * FROM repair WHERE equipmentId IN $instanceIds ORDER BY createdAt DESC;
        SELECT * FROM audit_item WHERE equipmentId IN $instanceIds ORDER BY checkedAt DESC;
      `,
          { instanceIds: [...instanceIds] },
        )
      : [[], [], []];
    const movementRows = batchRows<WorkflowRow>(relatedResult, 0);
    const repairs = batchRows<Record<string, unknown>>(relatedResult, 1);
    const audits = batchRows<Record<string, unknown>>(relatedResult, 2);
    const needle = instanceQuery?.trim().toLowerCase();
    const filteredInstances = needle
      ? instances.filter((item) =>
          [
            item.equipmentName,
            item.inventoryNumber,
            item.serialNumber,
            item.roomLabel,
            item.responsibleLabel,
            item.status,
            item.condition,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(needle),
        )
      : instances;
    const lookup = buildLookupSet({
      equipmentModels: [equipment],
      equipmentInstances: rawInstances,
      rooms,
      buildings,
      users,
    });
    const movements = enrichWorkflowRowsWithLookup(
      movementRows,
      lookup,
      "movements",
    );
    return {
      equipment: equipmentWithSupplier,
      instances,
      filteredInstances,
      instanceQuery: instanceQuery ?? "",
      movements,
      repairs,
      audits,
      files,
    };
  });
}
