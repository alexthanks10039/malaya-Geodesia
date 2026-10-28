import process from "node:process";

if (!(process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL)) {
  console.log("Postgres connection is not configured; skipping database migrations.");
  process.exit(0);
}

await import("./db-migrate.mjs");
