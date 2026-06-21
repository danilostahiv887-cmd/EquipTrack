import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Surreal } from "surrealdb";
import { withDatabase } from "@/lib/db/client";
import { queryRows } from "@/lib/db/repository";
import { recordIdToString, toRecordId } from "@/lib/db/record-id";
import type { WorkspaceUser } from "@/lib/types";

const sessionCookie = "equiptrack_session";
const sessionDurationMs = 1000 * 60 * 60 * 24 * 14;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

type SessionIdentity = { userId?: unknown; email: string };

export async function createSession(identity: SessionIdentity, database?: Surreal) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
  const value: Record<string, unknown> = {
    userEmail: identity.email.toLowerCase(),
    tokenHash: digest(token),
    expiresAt,
    createdAt: new Date().toISOString(),
  };
  const userId = identity.userId ? recordIdToString(identity.userId) : "";
  if (userId && userId !== "[object Object]") value.userId = userId;
  const createRecord = (db: Surreal) => db.query("CREATE session CONTENT $value;", { value });
  if (database) await createRecord(database);
  else await withDatabase(createRecord);
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
      const sessions = await queryRows<{ userId?: unknown; userEmail?: string }>(db, "SELECT userId, userEmail FROM session WHERE tokenHash = $hash AND expiresAt > $now LIMIT 1;", { hash: digest(token), now: new Date().toISOString() });
      const session = sessions[0];
      if (!session?.userEmail && !session?.userId) return null;
      const users = session.userEmail
        ? await queryRows<Record<string, unknown>>(db, "SELECT id, fullName, email, role, status FROM user WHERE email = $email LIMIT 1;", { email: session.userEmail })
        : await queryRows<Record<string, unknown>>(db, "SELECT id, fullName, email, role, status FROM user WHERE id = $id LIMIT 1;", { id: toRecordId(session.userId) });
      const user = users[0];
      if (!user || user.status !== "active") return null;
      return { id: recordIdToString(user.id), fullName: String(user.fullName), email: String(user.email), role: user.role as WorkspaceUser["role"], status: "active" };
    });
  } catch {
    return null;
  }
}
