import process from "node:process";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.log(JSON.stringify({ configured: false, migrations: [] }));
  process.exit(0);
}

const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
const pool = new Pool({
  connectionString,
  max: 1,
  ssl: isLocal || process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

try {
  const result = await pool.query(
    "SELECT id, applied_at FROM cms_migrations ORDER BY id",
  );
  console.log(JSON.stringify({
    configured: true,
    migrations: result.rows.map((row) => ({
      id: row.id,
      appliedAt: new Date(row.applied_at).toISOString(),
    })),
  }));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
