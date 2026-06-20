import "dotenv/config";
import { withDatabase } from "../src/lib/db/client";
import { schemaStatements } from "../src/lib/db/schema";
import { seedDatabase } from "../src/lib/db/seed";

withDatabase(async (db) => {
  for (const statement of schemaStatements) await db.query(statement);
  const result = await seedDatabase(db);
  console.log(result.seeded ? "Схему й початкові дані створено." : "Схему перевірено, дані вже існують.");
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Не вдалося налаштувати застосунок.");
  process.exitCode = 1;
});
