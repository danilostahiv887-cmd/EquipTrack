import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { withDatabase } from "@/lib/db/client";
import { queryRows } from "@/lib/db/repository";

export async function GET(_: Request, { params }: { params: Promise<{ fileId: string; variant: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user, "equipment:read")) return new NextResponse("Доступ заборонено", { status: 403 });
  const { fileId, variant } = await params;
  const file = await withDatabase(async (db) => (await queryRows<Record<string, unknown>>(db, "SELECT * FROM file WHERE id = $id LIMIT 1;", { id: decodeURIComponent(fileId) }))[0]).catch(() => undefined);
  if (!file) return new NextResponse("Файл не знайдено", { status: 404 });
  const bytes = variant === "preview" && file.previewData ? file.previewData : file.data;
  if (!bytes) return new NextResponse("Варіант файлу не знайдено", { status: 404 });
  const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes as ArrayBuffer);
  const responseBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  return new NextResponse(responseBody, { headers: { "Content-Type": String(file.mimeType || "application/octet-stream"), "Content-Length": String(body.byteLength), "Content-Disposition": variant === "preview" ? "inline" : `inline; filename="${String(file.name || "file")}"`, "Cache-Control": variant === "preview" ? "private, max-age=3600" : "private, no-store" } });
}
