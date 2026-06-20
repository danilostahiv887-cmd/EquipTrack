import { logoutAction } from "@/server/actions/auth";
import type { WorkspaceUser } from "@/lib/types";

const labels = { staff: "Працівник", inventory_manager: "Менеджер обліку", admin: "Адміністратор" };
export function UserMenu({ user }: { user: WorkspaceUser }) {
  return <div className="user-menu"><div className="user-initials" aria-hidden>{user.fullName.split(" ").slice(0, 2).map((part) => part[0]).join("")}</div><div><strong>{user.fullName}</strong><span>{labels[user.role]}</span></div><form action={logoutAction}><button type="submit">Вийти</button></form></div>;
}
