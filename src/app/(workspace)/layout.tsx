import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isConfigured } from "@/lib/env";
import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { DatabaseWakeScreen } from "@/components/system/database-wake-screen";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!isConfigured) redirect("/setup");
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return (
      <DatabaseWakeScreen reason="Не вдалося прочитати сесію, бо SurrealDB тимчасово не відповідає." />
    );
  }
  if (!user) redirect("/login");
  return <WorkspaceShell user={user}>{children}</WorkspaceShell>;
}
