import { closeDatabaseConnection, withDatabase } from "../src/lib/db/client";
import { seedDatabase } from "../src/lib/db/seed";

withDatabase(async (db) => {
  const result = await seedDatabase(db);
  console.log(
    result.seeded ? "Початкові дані створено." : "Початкові дані вже існують.",
  );
})
  .catch((error: unknown) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Не вдалося створити початкові дані.",
    );
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnection);
