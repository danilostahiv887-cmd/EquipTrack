import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can, type Permission } from "@/lib/auth/permissions";
import {
  getAuditFormReferences,
  getWorkflowFormReferences,
} from "@/server/services/catalog";

export const dynamic = "force-dynamic";

const requiredPermission: Record<string, Permission> = {
  movements: "movement:manage",
  requests: "request:create",
  repairs: "repair:report",
  audits: "audit:manage",
};

export async function GET(
  _: Request,
  { params }: { params: Promise<{ scope: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Потрібна авторизація." },
      { status: 401 },
    );

  const { scope } = await params;
  const permission = requiredPermission[scope];
  if (!permission)
    return NextResponse.json({ error: "Невідомий довідник." }, { status: 404 });
  if (!can(user, permission))
    return NextResponse.json({ error: "Недостатньо прав." }, { status: 403 });

  const data =
    scope === "audits"
      ? await getAuditFormReferences()
      : await getWorkflowFormReferences();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
