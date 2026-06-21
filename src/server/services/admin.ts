import { withDatabase } from "@/lib/db/client";
import { queryRows, type Page } from "@/lib/db/repository";
import { enrichFiles, type FileAttachment } from "@/server/services/display";

export async function getUsers(page: number, filters?: { q?: string; role?: string; status?: string }): Promise<Page<Record<string, unknown>>> {
  return withDatabase(async (db) => {
    const pageSize = 12;
    const safePage = Math.max(1, page);
    const rows = await queryRows<Record<string, unknown>>(db, "SELECT id, fullName, email, role, status, position, createdAt FROM user ORDER BY fullName;");
    const needle = filters?.q?.trim().toLowerCase();
    const filtered = rows.filter((item) => {
      if (needle && ![item.fullName, item.email, item.position, item.role, item.status].filter(Boolean).join(" ").toLowerCase().includes(needle)) return false;
      if (filters?.role && item.role !== filters.role) return false;
      if (filters?.status && item.status !== filters.status) return false;
      return true;
    });
    return { items: filtered.slice((safePage - 1) * pageSize, safePage * pageSize), total: filtered.length, page: safePage, pageSize };
  });
}
export async function getDocuments(page: number, filters?: string | { q?: string; type?: string; kind?: string }): Promise<Page<FileAttachment>> {
  return withDatabase(async (db) => {
    const pageSize = 12;
    const safePage = Math.max(1, page);
    const options = typeof filters === "string" ? { q: filters } : filters ?? {};
    const rows = await queryRows<FileAttachment>(db, "SELECT id, name, mimeType, size, kind, entityType, entityId, createdAt FROM file ORDER BY createdAt DESC;");
    const enriched = await enrichFiles(db, rows);
    const needle = options.q?.trim().toLowerCase();
    const filtered = enriched.filter((item) => {
      if (needle && ![item.name, item.mimeType, item.kind, item.targetLabel, item.targetTypeLabel].filter(Boolean).join(" ").toLowerCase().includes(needle)) return false;
      if (options.type && item.entityType !== options.type) return false;
      if (options.kind && item.kind !== options.kind) return false;
      return true;
    });
    return { items: filtered.slice((safePage - 1) * pageSize, safePage * pageSize), total: filtered.length, page: safePage, pageSize };
  });
}
