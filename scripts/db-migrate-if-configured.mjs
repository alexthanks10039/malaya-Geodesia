import process from "node:process";

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL is not configured; skipping database migrations.");
  process.exit(0);
}

await import("./db-migrate.mjs");
