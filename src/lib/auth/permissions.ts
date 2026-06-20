import { AccessError } from "@/lib/errors";
import type { Role, WorkspaceUser } from "@/lib/types";

export type Permission = "equipment:read" | "equipment:manage" | "room:read" | "room:manage" | "movement:manage" | "request:create" | "request:manage" | "repair:report" | "repair:manage" | "audit:manage" | "writeoff:propose" | "writeoff:approve" | "user:manage" | "analytics:read" | "reference:manage";

const permissions: Record<Role, readonly Permission[]> = {
  staff: ["equipment:read", "room:read", "request:create", "repair:report"],
  inventory_manager: ["equipment:read", "equipment:manage", "room:read", "room:manage", "movement:manage", "request:create", "request:manage", "repair:report", "repair:manage", "audit:manage", "writeoff:propose", "analytics:read"],
  admin: ["equipment:read", "equipment:manage", "room:read", "room:manage", "movement:manage", "request:create", "request:manage", "repair:report", "repair:manage", "audit:manage", "writeoff:propose", "writeoff:approve", "user:manage", "analytics:read", "reference:manage"],
};

export function can(user: Pick<WorkspaceUser, "role">, permission: Permission) {
  return permissions[user.role].includes(permission);
}

export function assertPermission(user: WorkspaceUser, permission: Permission) {
  if (!can(user, permission)) throw new AccessError();
}
