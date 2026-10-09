import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Did you forget to provision a database? Falling back to no persistence.",
  );
}

// Each concurrently running function instance gets its own pool, so keep it small
// and let idle connections go quickly; otherwise a burst of requests (everyone at
// the table tapping at once) can exhaust Postgres' connection limit.
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

if (pool) {
  // Keeps the Vercel function alive just long enough to close idle connections
  // instead of leaking them when the instance is suspended. No-op off Vercel.
  attachDatabasePool(pool);
}

export const db = pool ? drizzle(pool, { schema }) : null;

export * from "./schema/index.js";
