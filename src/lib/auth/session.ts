import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { withDatabase } from "@/lib/db/client";
import { queryRows } from "@/lib/db/repository";
import type { WorkspaceUser } from "@/lib/types";

const sessionCookie = "equiptrack_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 14;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const stringifyId = (id: unknown) => typeof id === "string" ? id : String(id);

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
  await withDatabase(async (db) => {
    await db.query("CREATE session CONTENT $value;", { value: { userId, tokenHash: digest(token), expiresAt, createdAt: new Date().toISOString() } });
  });
  const store = await cookies();
  store.set(sessionCookie, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(expiresAt) });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(sessionCookie)?.value;
  if (token) {
    await withDatabase(async (db) => {
      await db.query("DELETE session WHERE tokenHash = $hash;", { hash: digest(token) });
    }).catch(() => undefined);
  }
  store.delete(sessionCookie);
}

export async function getCurrentUser(): Promise<WorkspaceUser | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  try {
    return await withDatabase(async (db) => {
      const sessions = await queryRows<{ userId: unknown }>(db, "SELECT userId FROM session WHERE tokenHash = $hash AND expiresAt > time::now() LIMIT 1;", { hash: digest(token) });
      const session = sessions[0];
      if (!session?.userId) return null;
      const users = await queryRows<Record<string, unknown>>(db, "SELECT id, fullName, email, role, status FROM user WHERE id = $id LIMIT 1;", { id: session.userId });
      const user = users[0];
      if (!user || user.status !== "active") return null;
      return { id: stringifyId(user.id), fullName: String(user.fullName), email: String(user.email), role: user.role as WorkspaceUser["role"], status: "active" };
    });
  } catch {
    return null;
  }
}
