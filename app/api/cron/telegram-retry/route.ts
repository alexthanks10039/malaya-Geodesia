import { NextResponse } from "next/server";
import { getLeadById } from "@/lib/telegram-leads";
import { sendOwnerLeadNotification } from "@/lib/telegram";
import {
  claimNextTelegramNotification,
  markTelegramNotificationFailed,
  markTelegramNotificationSent,
} from "@/lib/telegram-outbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.TG_KEY || !process.env.OWNER_ID) {
    return NextResponse.json({ ok: false, message: "Telegram is not configured" }, { status: 503 });
  }

  let processed = 0;
  let delivered = 0;
  let failed = 0;

  for (let i = 0; i < 10; i += 1) {
    const notification = await claimNextTelegramNotification();
    if (!notification) break;

    processed += 1;
    const lead = await getLeadById(notification.leadId);

    if (!lead) {
      failed += 1;
      await markTelegramNotificationFailed(
        notification.id,
        new Error("Lead not found"),
        notification.attempts,
      );
      continue;
    }

    try {
      const sent = await sendOwnerLeadNotification(lead);
      await markTelegramNotificationSent(notification.id, sent.messageId);
      delivered += 1;
    } catch (error) {
      failed += 1;
      await markTelegramNotificationFailed(notification.id, error, notification.attempts);
    }
  }

  return NextResponse.json({ ok: true, processed, delivered, failed });
}
