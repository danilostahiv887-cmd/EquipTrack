import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isConfigured } from "@/lib/env";
import { WorkspaceShell } from "@/components/layout/workspace-shell";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isConfigured) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <WorkspaceShell user={user}>{children}</WorkspaceShell>;
}
