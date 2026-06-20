import bcrypt from "bcryptjs";
import sharp from "sharp";
import type { Surreal } from "surrealdb";

const now = () => new Date().toISOString();

async function seedImage(index: number) {
  const palette = [[12,157,176], [36,114,75], [182,106,28], [46,67,76], [114,85,139], [118,133,68], [162,69,77], [78,104,131]];
  const [r, g, b] = palette[index % palette.length];
  const data = await sharp({ create: { width: 960, height: 640, channels: 3, background: { r, g, b } } }).webp({ quality: 76 }).toBuffer();
  const preview = await sharp(data).resize({ width: 480, height: 320 }).webp({ quality: 70 }).toBuffer();
  return { data: new Uint8Array(data), previewData: new Uint8Array(preview), mimeType: "image/webp", width: 960, height: 640 };
}

async function create(db: Surreal, table: string, id: string, value: Record<string, unknown>) {
  await db.query(`CREATE ${table}:${id} CONTENT $value;`, { value });
}

export async function seedDatabase(db: Surreal) {
  const existing = await db.query<unknown[]>("SELECT count() AS total FROM user GROUP ALL;");
  const rows = (existing[0] ?? []) as Array<{ total?: number }>;
  if (Number(rows[0]?.total ?? 0) > 0) return { seeded: false };

  const adminHash = await bcrypt.hash("admin123", 12);
  const managerHash = await bcrypt.hash("manager123", 12);
  const staffHash = await bcrypt.hash("staff123", 12);
  const createdAt = now();

  await create(db, "user", "admin", { fullName: "Олена Коваль", email: "admin@equiptrack.local", passwordHash: adminHash, role: "admin", status: "active", position: "Адміністратор системи", createdAt });
  for (const [id, fullName] of [["manager-1", "Ірина Бондар"], ["manager-2", "Андрій Марченко"]] as const) {
    await create(db, "user", id, { fullName, email: `${id}@equiptrack.local`, passwordHash: managerHash, role: "inventory_manager", status: "active", position: "Менеджер обліку", createdAt });
  }
  for (let index = 1; index <= 8; index += 1) {
    await create(db, "user", `staff-${index}`, { fullName: `Працівник ${index}`, email: `staff${index}@equiptrack.local`, passwordHash: staffHash, role: "staff", status: "active", position: "Відповідальна особа", createdAt });
  }

  await create(db, "building", "main", { name: "Головний корпус", code: "ГК", address: "вул. Освітня, 1", isActive: true, createdAt });
  await create(db, "building", "lab", { name: "Лабораторний корпус", code: "ЛК", address: "вул. Освітня, 3", isActive: true, createdAt });
  const roomTypes = ["Навчальна аудиторія", "Комп’ютерна лабораторія", "Фізична лабораторія", "Склад", "Серверна"];
  for (const [index, name] of roomTypes.entries()) await create(db, "room_type", `type-${index + 1}`, { name, slug: `type-${index + 1}`, createdAt });
  const categories = ["Комп’ютерна техніка", "Мультимедійне обладнання", "Лабораторне обладнання", "Меблі", "Мережеве обладнання", "Спортивний інвентар", "Інструменти", "Побутова техніка"];
  for (const [index, name] of categories.entries()) await create(db, "category", `category-${index + 1}`, { name, slug: `category-${index + 1}`, createdAt });
  for (let index = 1; index <= 8; index += 1) {
    const fileId = `file:category-image-${index}`;
    await create(db, "file", `category-image-${index}`, { ...(await seedImage(index)), name: `category-${index}.webp`, kind: "photo", entityType: "category", entityId: `category:category-${index}`, uploadedBy: "user:admin", createdAt });
    await db.query("UPDATE $id MERGE { imageFileId: $fileId };", { id: `category:category-${index}`, fileId });
  }
  for (let index = 1; index <= 8; index += 1) await create(db, "supplier", `supplier-${index}`, { name: `Постачальник ${index}`, type: index % 2 ? "постачальник" : "донор", createdAt });
  for (let index = 1; index <= 16; index += 1) {
    await create(db, "room", `room-${index}`, { buildingId: index <= 8 ? "building:main" : "building:lab", roomTypeId: `room_type:type-${(index % 5) + 1}`, responsibleId: `user:staff-${((index - 1) % 8) + 1}`, number: String(100 + index), floor: Math.ceil(index / 5), capacity: 18 + index, status: "active", createdAt });
  }
  for (let index = 1; index <= 5; index += 1) {
    const fileId = `file:room-image-${index}`;
    await create(db, "file", `room-image-${index}`, { ...(await seedImage(index + 2)), name: `room-${index}.webp`, kind: "photo", entityType: "room", entityId: `room:room-${index}`, uploadedBy: "user:admin", createdAt });
    await db.query("UPDATE $id MERGE { photoFileId: $fileId };", { id: `room:room-${index}`, fileId });
  }
  for (let index = 1; index <= 45; index += 1) {
    const equipmentId = `equipment-${index}`;
    const roomId = `room:room-${((index - 1) % 16) + 1}`;
    const categoryId = `category:category-${((index - 1) % 8) + 1}`;
    const responsibleId = `user:staff-${((index - 1) % 8) + 1}`;
    await create(db, "equipment", equipmentId, { name: `Обладнання ${index}`, inventoryNumber: `ЕТ-${String(index).padStart(4, "0")}`, serialNumber: `SN-${2026000 + index}`, categoryId, currentRoomId: roomId, currentResponsibleId: responsibleId, supplierId: `supplier:supplier-${((index - 1) % 8) + 1}`, acquisitionDate: "2025-09-01", price: 5000 + index * 250, warrantyUntil: "2027-09-01", status: "active", condition: index % 9 === 0 ? "needs_repair" : "good", createdAt, updatedAt: createdAt });
    await create(db, "movement", `initial-${index}`, { equipmentId: `equipment:${equipmentId}`, movementType: "received", toRoomId: roomId, toResponsibleId: responsibleId, performedBy: "user:admin", acceptedBy: responsibleId, movementDate: createdAt, reason: "Первинне надходження", createdAt });
  }
  for (let index = 1; index <= 5; index += 1) {
    const fileId = `file:equipment-image-${index}`;
    await create(db, "file", `equipment-image-${index}`, { ...(await seedImage(index + 4)), name: `equipment-${index}.webp`, kind: "photo", entityType: "equipment", entityId: `equipment:equipment-${index}`, uploadedBy: "user:admin", createdAt });
    await db.query("UPDATE $id MERGE { photoFileId: $fileId };", { id: `equipment:equipment-${index}`, fileId });
  }
  for (let index = 1; index <= 15; index += 1) await create(db, "movement", `transfer-${index}`, { equipmentId: `equipment:equipment-${index}`, movementType: "transferred", fromRoomId: `room:room-${index}`, toRoomId: `room:room-${(index % 16) + 1}`, performedBy: "user:manager-1", movementDate: createdAt, reason: "Навчальна потреба", createdAt });
  for (let index = 1; index <= 12; index += 1) await create(db, "transfer_request", `request-${index}`, { equipmentId: `equipment:equipment-${index}`, requestedBy: `user:staff-${((index - 1) % 8) + 1}`, fromRoomId: `room:room-${((index - 1) % 16) + 1}`, toRoomId: `room:room-${(index % 16) + 1}`, status: index % 3 === 0 ? "approved" : "submitted", reason: "Потреба навчального процесу", createdAt, updatedAt: createdAt });
  for (let index = 1; index <= 10; index += 1) await create(db, "repair", `repair-${index}`, { equipmentId: `equipment:equipment-${index}`, reportedBy: `user:staff-${((index - 1) % 8) + 1}`, issueDescription: "Потребує діагностики", severity: "medium", status: index % 2 ? "under_review" : "reported", createdAt, updatedAt: createdAt });
  for (let index = 1; index <= 6; index += 1) await create(db, "audit", `audit-${index}`, { title: `Інвентаризація приміщення ${100 + index}`, roomId: `room:room-${index}`, plannedDate: "2026-06-30", status: index < 3 ? "completed" : "planned", createdBy: "user:manager-1", createdAt, updatedAt: createdAt });
  for (let index = 1; index <= 45; index += 1) await create(db, "audit_item", `audit-item-${index}`, { auditId: `audit:audit-${((index - 1) % 6) + 1}`, equipmentId: `equipment:equipment-${index}`, expectedRoomId: `room:room-${((index - 1) % 16) + 1}`, actualRoomId: `room:room-${((index - 1) % 16) + 1}`, expectedCondition: "good", actualCondition: index % 11 === 0 ? "damaged" : "good", resultStatus: index % 11 === 0 ? "damaged" : "found", checkedBy: "user:manager-1", checkedAt: createdAt });
  for (let index = 1; index <= 5; index += 1) await create(db, "writeoff_request", `writeoff-${index}`, { equipmentId: `equipment:equipment-${index + 30}`, reason: "Фізичний знос обладнання", status: index < 3 ? "proposed" : "completed", proposedBy: "user:manager-1", approvedBy: index > 2 ? "user:admin" : undefined, createdAt });
  for (let index = 1; index <= 20; index += 1) await create(db, "notification", `notification-${index}`, { userId: `user:staff-${((index - 1) % 8) + 1}`, type: "equipment_assigned", title: "Обладнання призначено", body: "Перевірте актуальний перелік обладнання у вашому приміщенні.", isRead: index % 3 === 0, createdAt });
  for (let index = 1; index <= 30; index += 1) await create(db, "audit_log", `log-${index}`, { actorId: index % 2 ? "user:manager-1" : "user:admin", action: index % 2 ? "equipment.updated" : "audit.completed", entityType: index % 2 ? "equipment" : "audit", entityId: index % 2 ? `equipment:equipment-${index}` : `audit:audit-${((index - 1) % 6) + 1}`, createdAt });
  return { seeded: true };
}
