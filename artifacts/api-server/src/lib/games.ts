import { addGamesBuyInColumnsSql, pool } from "@workspace/db";

let columnsReady: Promise<unknown> | null = null;

// Run before any query that selects every games column, so a database created
// before the buy-in columns existed doesn't fail the select.
export function ensureGamesColumns() {
  if (!pool) return Promise.resolve();
  columnsReady ??= pool.query(addGamesBuyInColumnsSql).catch((error) => {
    columnsReady = null;
    throw error;
  });
  return columnsReady;
}
