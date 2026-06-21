import { withDatabase } from "@/lib/db/client";
import { batchRows, queryBatch, type Page } from "@/lib/db/repository";
import { buildLookupSet, enrichWorkflowRowsWithLookup } from "@/server/services/display";

export type WorkflowRecord = Record<string, unknown> & { id: unknown; createdAt?: string; status?: string; title?: string; reason?: string; name?: string; inventoryNumber?: string; equipmentId?: string };
export type WorkflowFilters = { q?: string; status?: string; type?: string; severity?: string; read?: string; action?: string; entity?: string };
const tables = { movements: "movement", requests: "transfer_request", repairs: "repair", audits: "audit", writeoffs: "writeoff_request", notifications: "notification", auditLog: "audit_log" } as const;
const orderBy: Record<keyof typeof tables, string> = {
  movements: "movementDate",
  requests: "createdAt",
  repairs: "createdAt",
  audits: "createdAt",
  writeoffs: "createdAt",
  notifications: "createdAt",
  auditLog: "createdAt",
};

export async function getWorkflowPage(kind: keyof typeof tables, page: number, filters?: string | WorkflowFilters): Promise<Page<WorkflowRecord>> {
  if (kind === "writeoffs") return getWriteoffPage(page, filters);
  return withDatabase(async (db) => {
    const pageSize = 12;
    const safePage = Math.max(1, page);
    const options = typeof filters === "string" ? { q: filters } : filters ?? {};
    const statusWhere = options.status ? "WHERE status = $status" : "";
    const result = await queryBatch(db, `
      SELECT * FROM ${tables[kind]} ${statusWhere} ORDER BY ${orderBy[kind]} DESC;
      SELECT id, name, manufacturer, model FROM equipment;
      SELECT id, equipmentId, inventoryNumber, serialNumber, currentRoomId FROM equipment_instance;
      SELECT id, number, name, buildingId FROM room;
      SELECT id, name FROM building;
      SELECT id, fullName, position, role FROM user;
      SELECT id, title, roomId, status FROM audit;
      SELECT auditId, equipmentId, scannedCode, resultStatus, expectedRoomId, actualRoomId, expectedSerialNumber, expectedInventoryNumber, actualCondition, expectedCondition, note, checkedAt FROM audit_item;
    `, options.status ? { status: options.status } : {});
    const rows = batchRows<WorkflowRecord>(result, 0);
    const lookup = buildLookupSet({
      equipmentModels: batchRows(result, 1),
      equipmentInstances: batchRows(result, 2),
      rooms: batchRows(result, 3),
      buildings: batchRows(result, 4),
      users: batchRows(result, 5),
      audits: batchRows(result, 6),
      auditItems: batchRows(result, 7),
    });
    const enriched = enrichWorkflowRowsWithLookup(rows, lookup, kind);
    const needle = options.q?.trim().toLowerCase();
    const filtered = enriched.filter((row) => {
      if (needle && !String(row.__search ?? "").includes(needle)) return false;
      if (options.status && row.status !== options.status) return false;
      if (options.severity && row.severity !== options.severity) return false;
      if (options.type) {
        const rowType = row.movementType ?? row.type ?? row.action ?? row.entityType;
        if (rowType !== options.type) return false;
      }
      if (options.action && row.action !== options.action) return false;
      if (options.entity && row.entityType !== options.entity) return false;
      if (options.read === "read" && row.isRead !== true) return false;
      if (options.read === "unread" && row.isRead === true) return false;
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

export async function getWriteoffPage(page: number, filters?: string | WorkflowFilters): Promise<Page<WorkflowRecord>> {
  return withDatabase(async (db) => {
    const pageSize = 12;
    const safePage = Math.max(1, page);
    const options = typeof filters === "string" ? { q: filters } : filters ?? {};
    const statusWhere = options.status ? "WHERE status = $status" : "";
    const result = await queryBatch(db, `
      SELECT * FROM writeoff_request ${statusWhere} ORDER BY createdAt DESC;
      SELECT id, name, manufacturer, model FROM equipment;
      SELECT id, equipmentId, inventoryNumber, serialNumber, currentRoomId FROM equipment_instance;
      SELECT id, fullName, position, role FROM user;
    `, options.status ? { status: options.status } : {});
    const rows = batchRows<WorkflowRecord>(result, 0);
    const lookup = buildLookupSet({
      equipmentModels: batchRows(result, 1),
      equipmentInstances: batchRows(result, 2),
      users: batchRows(result, 3),
    });
    const enriched = enrichWorkflowRowsWithLookup(rows, lookup, "writeoffs");
    const needle = options.q?.trim().toLowerCase();
    const filtered = enriched.filter((row) => !needle || String(row.__search ?? "").includes(needle));
    return {
      items: filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
      total: filtered.length,
      page: safePage,
      pageSize,
    };
  });
}

export async function getDashboardMetrics() {
  return withDatabase(async (db) => {
    const result = await queryBatch(db, `
      SELECT count() AS total FROM equipment_instance GROUP ALL;
      SELECT count() AS total FROM equipment_instance WHERE condition = 'needs_repair' OR condition = 'damaged' GROUP ALL;
      SELECT count() AS total FROM transfer_request WHERE status = 'submitted' GROUP ALL;
      SELECT count() AS total FROM audit WHERE status = 'in_progress' GROUP ALL;
      SELECT count() AS total FROM user WHERE status = 'active' GROUP ALL;
      SELECT count() AS total FROM writeoff_request WHERE status = 'proposed' GROUP ALL;
      SELECT * FROM movement ORDER BY movementDate DESC LIMIT 6;
      SELECT id, name, manufacturer, model FROM equipment;
      SELECT id, equipmentId, inventoryNumber, serialNumber, currentRoomId FROM equipment_instance;
      SELECT id, number, name, buildingId FROM room;
      SELECT id, name FROM building;
      SELECT id, fullName, position, role FROM user;
    `);
    const total = (index: number) => Number(batchRows<{ total: number }>(result, index)[0]?.total ?? 0);
    const equipment = total(0);
    const repair = total(1);
    const requests = total(2);
    const audits = total(3);
    const users = total(4);
    const writeoffs = total(5);
    const recentRaw = batchRows<WorkflowRecord>(result, 6);
    const lookup = buildLookupSet({
      equipmentModels: batchRows(result, 7),
      equipmentInstances: batchRows(result, 8),
      rooms: batchRows(result, 9),
      buildings: batchRows(result, 10),
      users: batchRows(result, 11),
    });
    const recent = enrichWorkflowRowsWithLookup(recentRaw, lookup, "movements");
    return { equipment, repair, requests, audits, users, writeoffs, recent };
  });
}

export async function getAnalytics() {
  return withDatabase(async (db) => {
    const result = await queryBatch(db, `
      SELECT condition, count() AS total FROM equipment_instance GROUP BY condition ORDER BY total DESC;
      SELECT categoryId, count() AS total FROM equipment GROUP BY categoryId ORDER BY total DESC;
      SELECT currentRoomId, count() AS total FROM equipment_instance GROUP BY currentRoomId ORDER BY total DESC;
      SELECT * FROM equipment_instance ORDER BY price DESC LIMIT 8;
      SELECT id, name FROM equipment;
    `);
    const condition = batchRows<{ condition: string; total: number }>(result, 0);
    const categories = batchRows<{ categoryId: string; total: number }>(result, 1);
    const buildings = batchRows<{ currentRoomId: string; total: number }>(result, 2);
    const highValueRaw = batchRows<WorkflowRecord>(result, 3);
    const models = batchRows<{ id: unknown; name?: string }>(result, 4);
    const modelNames = new Map(models.map((item) => [String(item.id).replace(/^([^:]+):⟨(.+)⟩$/, "$1:$2"), item.name ?? "Обладнання"]));
    const highValue = highValueRaw.map((row) => ({ ...row, name: modelNames.get(String(row.equipmentId)) ?? "Обладнання" }));
    return { condition, categories, buildings, highValue };
  });
}
