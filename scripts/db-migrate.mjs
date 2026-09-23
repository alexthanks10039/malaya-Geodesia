import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
const pool = new Pool({
  connectionString,
  max: 2,
  ssl: isLocal || process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});
const client = await pool.connect();

try {
  await client.query("SET lock_timeout = '10s'");
  await client.query("SELECT pg_advisory_lock(hashtext('malaya-geodesia:db-migrations'))");

  await client.query(
    "CREATE TABLE IF NOT EXISTS cms_migrations(id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );

  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();

  for (const file of files) {
    const existing = await client.query("SELECT 1 FROM cms_migrations WHERE id=$1", [file]);
    if (existing.rowCount) continue;

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO cms_migrations(id) VALUES($1)", [file]);
      await client.query("COMMIT");
      console.log("Applied", file);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Migration failed:", file);
      throw error;
    }
  }

  console.log("Database migrations are up to date.");
} finally {
  try {
    await client.query("SELECT pg_advisory_unlock(hashtext('malaya-geodesia:db-migrations'))");
  } catch {}
  client.release();
  await pool.end();
}
