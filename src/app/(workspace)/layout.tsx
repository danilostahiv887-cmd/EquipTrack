import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isConfigured } from "@/lib/env";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!isConfigured) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}
