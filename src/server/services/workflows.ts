import { withDatabase } from "@/lib/db/client";
import { queryPage, queryRows, type Page } from "@/lib/db/repository";

export type WorkflowRecord = Record<string, unknown> & { id: unknown; createdAt?: string; status?: string; title?: string; reason?: string };
const tables = { movements: "movement", requests: "transfer_request", repairs: "repair", audits: "audit", writeoffs: "writeoff_request", notifications: "notification", auditLog: "audit_log" } as const;

export async function getWorkflowPage(kind: keyof typeof tables, page: number): Promise<Page<WorkflowRecord>> {
  return withDatabase((db) => queryPage<WorkflowRecord>(db, tables[kind], page));
}

export async function getDashboardMetrics() {
  return withDatabase(async (db) => {
    const count = async (table: string, where = "") => Number((await queryRows<{ total: number }>(db, `SELECT count() AS total FROM ${table}${where} GROUP ALL;`))[0]?.total ?? 0);
    const [equipment, repair, requests, audits, users, writeoffs, recent] = await Promise.all([
      count("equipment"), count("equipment", " WHERE condition = 'needs_repair' OR condition = 'damaged'"), count("transfer_request", " WHERE status = 'submitted'"), count("audit", " WHERE status = 'in_progress'"), count("user", " WHERE status = 'active'"), count("writeoff_request", " WHERE status = 'proposed'"), queryRows<WorkflowRecord>(db, "SELECT * FROM movement ORDER BY movementDate DESC LIMIT 6;"),
    ]);
    return { equipment, repair, requests, audits, users, writeoffs, recent };
  });
}

export async function getAnalytics() {
  return withDatabase(async (db) => {
    const [condition, categories, buildings, highValue] = await Promise.all([
      queryRows<{ condition: string; total: number }>(db, "SELECT condition, count() AS total FROM equipment GROUP BY condition ORDER BY total DESC;"),
      queryRows<{ categoryId: string; total: number }>(db, "SELECT categoryId, count() AS total FROM equipment GROUP BY categoryId ORDER BY total DESC;"),
      queryRows<{ currentRoomId: string; total: number }>(db, "SELECT currentRoomId, count() AS total FROM equipment GROUP BY currentRoomId ORDER BY total DESC;"),
      queryRows<WorkflowRecord>(db, "SELECT * FROM equipment ORDER BY price DESC LIMIT 8;"),
    ]);
    return { condition, categories, buildings, highValue };
  });
}
