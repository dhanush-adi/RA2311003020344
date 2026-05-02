// src/config/initDb.ts — Run schema.sql against the connected PostgreSQL DB

import * as fs   from "fs";
import * as path from "path";
import { Pool }  from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function initDatabase(): Promise<void> {
  const pool = new Pool({
    host:     process.env.DB_HOST     ?? "localhost",
    port:     parseInt(process.env.DB_PORT ?? "5432", 10),
    database: process.env.DB_NAME     ?? "campus_notifications",
    user:     process.env.DB_USER     ?? "postgres",
    password: process.env.DB_PASSWORD || undefined,
  });

  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql  = fs.readFileSync(schemaPath, "utf8");

  console.log("Running schema migrations...");
  await pool.query(schemaSql);
  console.log("Schema applied successfully.");
  await pool.end();
}

initDatabase().catch((err) => {
  console.error("DB init failed:", err);
  process.exit(1);
});
