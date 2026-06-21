import type { Surreal } from "surrealdb";

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export async function queryRows<T>(db: Surreal, query: string, variables: Record<string, unknown> = {}) {
  const result = await db.query<unknown[]>(query, variables);
  return (result[0] ?? []) as T[];
}

export async function queryBatch(db: Surreal, query: string, variables: Record<string, unknown> = {}) {
  return db.query<unknown[]>(query, variables);
}

export function batchRows<T>(result: unknown[], index: number) {
  return (result[index] ?? []) as T[];
}

export async function queryPage<T>(db: Surreal, table: string, page = 1, pageSize = 12): Promise<Page<T>> {
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * pageSize;
  const items = await queryRows<T>(db, `SELECT * FROM ${table} LIMIT $limit START $offset`, { limit: pageSize, offset });
  const count = await queryRows<{ total: number }>(db, `SELECT count() AS total FROM ${table} GROUP ALL`);
  return { items, total: Number(count[0]?.total ?? 0), page: safePage, pageSize };
}
