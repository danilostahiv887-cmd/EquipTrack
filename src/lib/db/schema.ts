const tables = [
  "user", "session", "building", "room_type", "room", "category", "supplier",
  "equipment", "file", "movement", "transfer_request", "repair", "audit",
  "audit_item", "writeoff_request", "notification", "audit_log",
];

export const schemaStatements = [
  ...tables.map((table) => `DEFINE TABLE OVERWRITE ${table} SCHEMALESS PERMISSIONS NONE;`),
  "DEFINE FIELD OVERWRITE data ON TABLE file TYPE bytes;",
  "DEFINE FIELD OVERWRITE previewData ON TABLE file TYPE option<bytes>;",
  "DEFINE INDEX OVERWRITE user_email ON TABLE user FIELDS email UNIQUE;",
  "DEFINE INDEX OVERWRITE equipment_inventory_number ON TABLE equipment FIELDS inventoryNumber UNIQUE;",
  "DEFINE INDEX OVERWRITE equipment_room ON TABLE equipment FIELDS currentRoomId;",
  "DEFINE INDEX OVERWRITE equipment_category ON TABLE equipment FIELDS categoryId;",
  "DEFINE INDEX OVERWRITE equipment_status ON TABLE equipment FIELDS status;",
  "DEFINE INDEX OVERWRITE equipment_condition ON TABLE equipment FIELDS condition;",
  "DEFINE INDEX OVERWRITE movement_equipment ON TABLE movement FIELDS equipmentId;",
  "DEFINE INDEX OVERWRITE movement_date ON TABLE movement FIELDS movementDate;",
  "DEFINE INDEX OVERWRITE room_building ON TABLE room FIELDS buildingId;",
  "DEFINE INDEX OVERWRITE room_type ON TABLE room FIELDS roomTypeId;",
  "DEFINE INDEX OVERWRITE transfer_status ON TABLE transfer_request FIELDS status;",
  "DEFINE INDEX OVERWRITE repair_status ON TABLE repair FIELDS status;",
  "DEFINE INDEX OVERWRITE audit_room_status ON TABLE audit FIELDS roomId, status;",
  "DEFINE INDEX OVERWRITE notification_user_read ON TABLE notification FIELDS userId, isRead;",
  "DEFINE INDEX OVERWRITE audit_log_actor_time ON TABLE audit_log FIELDS actorId, createdAt;",
] as const;
