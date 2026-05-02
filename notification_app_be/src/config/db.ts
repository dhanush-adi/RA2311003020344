// src/config/db.ts — PostgreSQL connection pool with logging

import { Pool, PoolConfig } from "pg";
import { createLogger } from "../../logging_middleware/src";

const dbLogger = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  process.env.EVAL_API_BASE
);

const poolConfig: PoolConfig = {
  host:     process.env.DB_HOST     ?? "localhost",
  port:     parseInt(process.env.DB_PORT ?? "5432", 10),
  database: process.env.DB_NAME     ?? "campus_notifications",
  user:     process.env.DB_USER     ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  min:      parseInt(process.env.DB_POOL_MIN ?? "2", 10),
  max:      parseInt(process.env.DB_POOL_MAX ?? "10", 10),
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 5000,
};

export const dbPool = new Pool(poolConfig);

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
