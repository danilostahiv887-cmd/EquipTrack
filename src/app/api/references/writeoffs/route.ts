import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getWriteoffEquipmentOptions } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: "Потрібна авторизація." },
      { status: 401 },
    );
  if (!can(user, "writeoff:propose"))
    return NextResponse.json({ error: "Недостатньо прав." }, { status: 403 });
  const equipment = await getWriteoffEquipmentOptions();
  return NextResponse.json(
    { equipment },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
