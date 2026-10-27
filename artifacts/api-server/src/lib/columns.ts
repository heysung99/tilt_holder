import { addMissingColumnsSql, pool } from "@workspace/db";

let columnsReady: Promise<unknown> | null = null;

// Run before any query that selects every column of games or current_session, so
// a database created before the newer columns existed doesn't fail the select.
export function ensureColumns() {
  if (!pool) return Promise.resolve();
  columnsReady ??= pool.query(addMissingColumnsSql).catch((error) => {
    columnsReady = null;
    throw error;
  });
  return columnsReady;
}
