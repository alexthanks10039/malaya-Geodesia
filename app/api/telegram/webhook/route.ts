import { NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/telegram";
import { claimTelegramUpdate, completeTelegramUpdate, failTelegramUpdate, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const expected = process.env.TG_WEBHOOK_SECRET?.trim();
    const received = request.headers.get("x-telegram-bot-api-secret-token")?.trim();

    if (!expected || received !== expected) {
      return NextResponse.json({ ok: false, message: "Invalid webhook secret" }, { status: 401 });
    }

    const update = await request.json();
    const updateId = Number(update?.update_id);
    if (!Number.isSafeInteger(updateId) || updateId < 0) {
      return NextResponse.json({ ok: false, message: "Invalid Telegram update" }, { status: 400 });
    }

    const claimed = await claimTelegramUpdate(updateId);
    if (!claimed) return NextResponse.json({ ok: true, duplicate: true });

    try {
      await handleTelegramUpdate(update);
      await completeTelegramUpdate(updateId);
      return NextResponse.json({ ok: true });
    } catch (error) {
      await failTelegramUpdate(updateId, error);
      throw error;
    }
  } catch (error) {
    console.error("[telegram.webhook]", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Telegram error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "malaya-geodesia-telegram",
    configured: Boolean(process.env.TG_KEY && process.env.OWNER_ID),
    webhookSecretConfigured: Boolean(process.env.TG_WEBHOOK_SECRET),
    durableDeduplication: isDatabaseConfigured(),
  });
}
