import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getAuditScanReferences } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ auditId: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Потрібна авторизація." },
      { status: 401 },
    );
  if (!can(user, "audit:manage"))
    return NextResponse.json({ error: "Недостатньо прав." }, { status: 403 });

  const { auditId } = await params;
  const data = await getAuditScanReferences(auditId);
  return NextResponse.json(
    { equipment: data.equipment, auditItems: data.auditItems },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
