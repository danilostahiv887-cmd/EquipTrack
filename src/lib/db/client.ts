import { Surreal } from "surrealdb";
import { env, isConfigured } from "@/lib/env";
import { SetupError } from "@/lib/errors";

export async function withDatabase<T>(work: (db: Surreal) => Promise<T>): Promise<T> {
  if (!isConfigured) throw new SetupError();

  const db = new Surreal();
  await db.connect(env.surrealUrl);
  await db.signin({ username: env.surrealUsername, password: env.surrealPassword });
  await db.use({ namespace: env.surrealNamespace, database: env.surrealDatabase });

  try {
    return await work(db);
  } finally {
    await db.close();
  }
}
