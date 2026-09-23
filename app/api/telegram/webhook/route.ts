import { NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const expected = process.env.TG_WEBHOOK_SECRET?.trim();
    const received = request.headers.get("x-telegram-bot-api-secret-token")?.trim();

    if (expected && received !== expected) {
      return NextResponse.json({ ok: false, message: "Invalid webhook secret" }, { status: 401 });
    }

    const update = await request.json();
    await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true });
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
  });
}
