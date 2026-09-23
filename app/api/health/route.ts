import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isDatabaseConfigured, query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, unknown> = {
    app: true,
    telegramConfigured: Boolean(process.env.TG_KEY && process.env.OWNER_ID),
    webhookSecretConfigured: Boolean(process.env.TG_WEBHOOK_SECRET),
  };

  let dbOk = false;
  let migrationsOk = !isDatabaseConfigured();

  if (isDatabaseConfigured()) {
    try {
      await query("SELECT 1");
      dbOk = true;

      const migrationDir = path.join(process.cwd(), "db", "migrations");
      const expected = fs.readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort();
      const appliedResult = await query<{ id: string }>("SELECT id FROM cms_migrations ORDER BY id");
      const applied = new Set(appliedResult.rows.map((row) => row.id));
      migrationsOk = expected.every((name) => applied.has(name));
      checks.migrations = { expected: expected.length, applied: applied.size, ok: migrationsOk };
    } catch (error) {
      checks.dbError = error instanceof Error ? error.message.slice(0, 160) : "Database check failed";
    }
  } else {
    checks.migrations = { configured: false };
  }

  checks.database = dbOk || !isDatabaseConfigured();

  const healthy = checks.app === true && checks.database === true && migrationsOk;
  return NextResponse.json(
    {
      ok: healthy,
      status: healthy ? "healthy" : "degraded",
      checks,
      build: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "local",
    },
    { status: healthy ? 200 : 503 },
  );
}
