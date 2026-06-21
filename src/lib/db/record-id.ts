import { RecordId } from "surrealdb";

function unwrapSurrealId(value: unknown) {
  const raw = String(value);
  if (raw.startsWith("⟨") && raw.endsWith("⟩")) return raw.slice(1, -1);
  return raw;
}

export function normalizeRecordIdString(value: unknown) {
  if (value instanceof RecordId) return `${value.table}:${unwrapSurrealId(value.id)}`;
  if (value && typeof value === "object" && "table" in value && "id" in value) {
    const record = value as { table: unknown; id: unknown };
    return `${record.table}:${unwrapSurrealId(record.id)}`;
  }
  const raw = String(value);
  const match = raw.match(/^([^:]+):⟨(.+)⟩$/);
  if (match) return `${match[1]}:${match[2]}`;
  return raw;
}

export function toRecordId(value: unknown) {
  if (value instanceof RecordId) return value;
  if (value && typeof value === "object" && "table" in value && "id" in value) {
    const record = value as { table: unknown; id: unknown };
    return new RecordId(String(record.table), unwrapSurrealId(record.id));
  }
  const raw = normalizeRecordIdString(value);
  const separator = raw.indexOf(":");
  if (separator <= 0) return value;
  return new RecordId(raw.slice(0, separator), raw.slice(separator + 1));
}

export function recordIdToString(value: unknown) {
  return normalizeRecordIdString(value);
}
