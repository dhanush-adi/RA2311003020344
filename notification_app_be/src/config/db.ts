// src/config/db.ts — PostgreSQL connection pool with logging

import { Pool } from "pg";
import { createLogger } from "logging-middleware";

const dbLogger = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  process.env.EVAL_API_BASE
);

// Use Unix Socket for the demo environment to bypass SASL/password issues
export const dbPool = new Pool({
  host: "/var/run/postgresql",
  port: 5432,
  database: "campus_notifications",
  user: "cobra",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

dbPool.on("connect", () => {
  dbLogger.debug("db", "New DB connection established from pool");
});

dbPool.on("error", (err) => {
  dbLogger.fatal("db", `Unexpected DB pool error: ${err.message}`);
});

/** Verify DB connectivity on startup */
export async function verifyDbConnection(): Promise<void> {
  try {
    const client = await dbPool.connect();
    await client.query("SELECT 1");
    client.release();
    dbLogger.info("db", "PostgreSQL connection pool ready");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    dbLogger.fatal("db", `DB connection failed: ${msg}`);
    throw err;
  }
}
