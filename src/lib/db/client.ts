import { Surreal } from "surrealdb";
import { env, isConfigured } from "@/lib/env";
import { SetupError } from "@/lib/errors";

type DatabaseState = {
  client?: Surreal;
  connection?: Promise<Surreal>;
};

const globalForDatabase = globalThis as typeof globalThis & {
  __equiptrackDatabase?: DatabaseState;
};

const databaseState = (globalForDatabase.__equiptrackDatabase ??= {});

async function connectDatabase() {
  const db = new Surreal();
  await db.connect(env.surrealUrl);
  await db.signin({
    username: env.surrealUsername,
    password: env.surrealPassword,
  });
  await db.use({
    namespace: env.surrealNamespace,
    database: env.surrealDatabase,
  });
  return db;
}

async function getDatabase() {
  if (!isConfigured) throw new SetupError();
  if (databaseState.client) return databaseState.client;
  databaseState.connection ??= connectDatabase()
    .then((client) => {
      databaseState.client = client;
      return client;
    })
    .catch((error) => {
      databaseState.client = undefined;
      databaseState.connection = undefined;
      throw error;
    });
  return databaseState.connection;
}

export async function closeDatabaseConnection() {
  const client = databaseState.client;
  databaseState.client = undefined;
  databaseState.connection = undefined;
  if (client) await client.close().catch(() => undefined);
}

export async function withDatabase<T>(
  work: (db: Surreal) => Promise<T>,
): Promise<T> {
  const db = await getDatabase();
  try {
    return await work(db);
  } catch (error) {
    await closeDatabaseConnection();
    throw error;
  }
}
