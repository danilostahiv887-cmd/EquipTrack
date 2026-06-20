import "dotenv/config";
import { withDatabase } from "../src/lib/db/client";
import { schemaStatements } from "../src/lib/db/schema";

withDatabase(async (db) => {
  for (const statement of schemaStatements) await db.query(statement);
  console.log("Схему SurrealDB застосовано.");
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Не вдалося застосувати схему.");
  process.exitCode = 1;
});
