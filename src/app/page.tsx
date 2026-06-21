import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
import { DatabaseWakeScreen } from "@/components/system/database-wake-screen";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isConfigured) redirect("/setup");
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    return <DatabaseWakeScreen reason="Головна сторінка очікує, поки SurrealDB стане доступною." />;
  }
  redirect(user ? "/dashboard" : "/login");
}
