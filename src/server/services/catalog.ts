import { withDatabase } from "@/lib/db/client";
import { queryPage, queryRows, type Page } from "@/lib/db/repository";

export type Room = { id: unknown; number: string; name?: string; buildingId: string; roomTypeId: string; responsibleId?: string; floor: number; capacity: number; status: string; description?: string };
export type Equipment = { id: unknown; name: string; inventoryNumber: string; serialNumber?: string; categoryId: string; currentRoomId: string; currentResponsibleId: string; price?: number; status: string; condition: string; photoFileId?: string; createdAt: string };
export type Reference = { id: unknown; name: string; number?: string; fullName?: string };

export async function getRooms(page: number, q?: string): Promise<Page<Room>> {
  return withDatabase(async (db) => {
    if (!q?.trim()) return queryPage<Room>(db, "room", page);
    const rows = await queryRows<Room>(db, "SELECT * FROM room WHERE number CONTAINS $q OR name CONTAINS $q ORDER BY number LIMIT 20 START $offset;", { q: q.trim(), offset: Math.max(0, page - 1) * 20 });
    const count = await queryRows<{ total: number }>(db, "SELECT count() AS total FROM room WHERE number CONTAINS $q OR name CONTAINS $q GROUP ALL;", { q: q.trim() });
    return { items: rows, total: Number(count[0]?.total ?? 0), page, pageSize: 20 };
  });
}

export async function getEquipment(page: number, q?: string): Promise<Page<Equipment>> {
  return withDatabase(async (db) => {
    if (!q?.trim()) return queryPage<Equipment>(db, "equipment", page);
    const rows = await queryRows<Equipment>(db, "SELECT * FROM equipment WHERE name CONTAINS $q OR inventoryNumber CONTAINS $q OR serialNumber CONTAINS $q ORDER BY name LIMIT 20 START $offset;", { q: q.trim(), offset: Math.max(0, page - 1) * 20 });
    const count = await queryRows<{ total: number }>(db, "SELECT count() AS total FROM equipment WHERE name CONTAINS $q OR inventoryNumber CONTAINS $q OR serialNumber CONTAINS $q GROUP ALL;", { q: q.trim() });
    return { items: rows, total: Number(count[0]?.total ?? 0), page, pageSize: 20 };
  });
}

export async function getReferences() {
  return withDatabase(async (db) => {
    const [buildings, types, categories, users] = await Promise.all([
      queryRows<Reference>(db, "SELECT id, name FROM building ORDER BY name;"),
      queryRows<Reference>(db, "SELECT id, name FROM room_type ORDER BY name;"),
      queryRows<Reference>(db, "SELECT id, name FROM category ORDER BY name;"),
      queryRows<Reference>(db, "SELECT id, fullName FROM user WHERE status = 'active' ORDER BY fullName;"),
    ]);
    return { buildings, types, categories, users };
  });
}

export async function getRoomPassport(id: string) {
  return withDatabase(async (db) => {
    const [room] = await queryRows<Room>(db, "SELECT * FROM room WHERE id = $id LIMIT 1;", { id });
    if (!room) return null;
    const [equipment, movements, audits] = await Promise.all([
      queryRows<Equipment>(db, "SELECT * FROM equipment WHERE currentRoomId = $id ORDER BY name;", { id }),
      queryRows<Record<string, unknown>>(db, "SELECT * FROM movement WHERE fromRoomId = $id OR toRoomId = $id ORDER BY movementDate DESC LIMIT 8;", { id }),
      queryRows<Record<string, unknown>>(db, "SELECT * FROM audit WHERE roomId = $id ORDER BY createdAt DESC LIMIT 8;", { id }),
    ]);
    return { room, equipment, movements, audits };
  });
}

export async function getEquipmentPassport(id: string) {
  return withDatabase(async (db) => {
    const [equipment] = await queryRows<Equipment>(db, "SELECT * FROM equipment WHERE id = $id LIMIT 1;", { id });
    if (!equipment) return null;
    const [movements, repairs, audits, files] = await Promise.all([
      queryRows<Record<string, unknown>>(db, "SELECT * FROM movement WHERE equipmentId = $id ORDER BY movementDate DESC;", { id }),
      queryRows<Record<string, unknown>>(db, "SELECT * FROM repair WHERE equipmentId = $id ORDER BY createdAt DESC;", { id }),
      queryRows<Record<string, unknown>>(db, "SELECT * FROM audit_item WHERE equipmentId = $id ORDER BY checkedAt DESC;", { id }),
      queryRows<Record<string, unknown>>(db, "SELECT id, name, mimeType, kind, createdAt FROM file WHERE entityId = $id ORDER BY createdAt DESC;", { id }),
    ]);
    return { equipment, movements, repairs, audits, files };
  });
}
