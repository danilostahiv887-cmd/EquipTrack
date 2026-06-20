import "dotenv/config";
import { withDatabase } from "../src/lib/db/client";

withDatabase(async (db) => {
  await db.query("DEFINE TABLE OVERWRITE file SCHEMALESS PERMISSIONS NONE;");
  await db.query("DEFINE FIELD OVERWRITE data ON TABLE file TYPE bytes;");
  await db.query("DEFINE FIELD OVERWRITE previewData ON TABLE file TYPE option<bytes>;");
  console.log("Сховище двійкових файлів SurrealDB готове.");
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Не вдалося налаштувати сховище файлів.");
  process.exitCode = 1;
});
