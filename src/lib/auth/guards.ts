import { redirect } from "next/navigation";
import { can, type Permission } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";

export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user || !can(user, permission)) redirect("/dashboard");
  return user;
}
