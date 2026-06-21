export type Role = "staff" | "inventory_manager" | "admin";
export type UserStatus = "active" | "inactive";
export type RoomStatus = "active" | "inactive" | "under_repair";
export type EquipmentStatus = "active" | "in_storage" | "in_repair" | "lost" | "written_off" | "archived";
export type EquipmentCondition = "new" | "good" | "satisfactory" | "needs_repair" | "damaged" | "unusable";
export type MovementType = "received" | "assigned_to_room" | "transferred" | "returned_to_storage" | "sent_to_repair" | "returned_from_repair" | "written_off" | "lost" | "found" | "corrected";
export type TransferRequestStatus = "draft" | "submitted" | "approved" | "rejected" | "completed" | "cancelled";
export type RepairStatus = "reported" | "under_review" | "sent_to_repair" | "repaired" | "not_repairable" | "cancelled";
export type AuditStatus = "planned" | "in_progress" | "completed" | "cancelled";
export type AuditItemStatus = "pending" | "found" | "missing" | "extra" | "damaged" | "moved" | "misplaced" | "unknown";
export type WriteoffStatus = "proposed" | "approved" | "rejected" | "completed" | "cancelled";
export type RecordId = string;

export interface UserRecord {
  id: RecordId;
  fullName: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  phone?: string;
  position?: string;
  createdAt: string;
}

export interface WorkspaceUser {
  id: RecordId;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
}
