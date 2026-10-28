import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createLeadRecord } from "@/lib/telegram-leads";
import { sendOwnerLeadNotification } from "@/lib/telegram";
import { isDatabaseConfigured } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  claimTelegramNotification,
  enqueueLeadNotification,
  getTelegramNotification,
  markTelegramNotificationFailed,
  markTelegramNotificationSent,
} from "@/lib/telegram-outbox";

const MAX_TEXT_LENGTH = 160;

function text(value: unknown, max = MAX_TEXT_LENGTH): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim().slice(0, 100) || randomUUID();
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 64 * 1024) {
      return NextResponse.json({ ok: false, code: "PAYLOAD_TOO_LARGE", message: "Слишком большой запрос", requestId }, { status: 413 });
    }

    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const clientKey = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
    const rate = await checkRateLimit(`leads:${clientKey}`);
    if (!rate.allowed) {
      return NextResponse.json(
        { ok: false, code: "RATE_LIMITED", message: "Слишком много заявок. Попробуйте позже.", requestId },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } },
      );
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, code: "INVALID_REQUEST", message: "Некорректный запрос", requestId }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const idempotencyKey = request.headers.get("idempotency-key")?.trim().slice(0, 128) || undefined;
    const phone = text(payload.phone, 32);
    const type = text(payload.type);
    const output = text(payload.output, 80);
    const urgency = text(payload.urgency, 80);
    const area = Number(payload.area);
    const complexityValue = Array.isArray(payload.complexity) ? payload.complexity : [];
    const complexity = complexityValue
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 80))
      .filter(Boolean);

    if (!phone) return NextResponse.json({ ok: false, message: "Укажите телефон" }, { status: 400 });

    const normalizedPhone = phone.replace(/[^+\d]/g, "");
    if (normalizedPhone.length < 10 || normalizedPhone.length > 16) {
      return NextResponse.json({ ok: false, message: "Проверьте номер телефона" }, { status: 400 });
    }
    if (!type) return NextResponse.json({ ok: false, message: "Выберите тип работы" }, { status: 400 });
    if (!Number.isFinite(area) || area <= 0 || area > 10_000_000) {
      return NextResponse.json({ ok: false, message: "Площадь должна быть больше 0 и не превышать 10 000 000 м²" }, { status: 400 });
    }
    if (!output) return NextResponse.json({ ok: false, message: "Выберите формат результата" }, { status: 400 });
    if (!urgency) return NextResponse.json({ ok: false, message: "Выберите срок выполнения" }, { status: 400 });
    if (complexity.length !== complexityValue.length || complexity.length > 20) {
      return NextResponse.json({ ok: false, message: "Некорректные условия объекта" }, { status: 400 });
    }

    const lead = await createLeadRecord({
      id: "GEO-" + Date.now(),
      phone: normalizedPhone,
      type,
      area,
      complexity,
      output,
      urgency,
      estimate: payload.estimate && typeof payload.estimate === "object"
        ? payload.estimate as Record<string, unknown>
        : null,
      source: "website",
      sourcePage: typeof payload.sourcePage === "string" ? payload.sourcePage.slice(0, 200) : "/calculator",
      createdAt: new Date().toISOString(),
      idempotencyKey,
    });

    let telegram = {
      ok: false,
      configured: Boolean(process.env.TG_KEY && process.env.OWNER_ID),
      queued: false,
      delivered: false,
    };

    if (telegram.configured) {
      try {
        if (isDatabaseConfigured()) {
          const queued = await enqueueLeadNotification(lead.id);
          const notification = queued ?? await getTelegramNotification(lead.id);
          telegram.queued = Boolean(notification);

          if (notification?.status === "sent") {
            telegram.delivered = true;
            telegram.ok = true;
          } else if (notification) {
            const claimed = await claimTelegramNotification(notification.id);
            if (claimed) {
              try {
                const sent = await sendOwnerLeadNotification(lead);
                await markTelegramNotificationSent(claimed.id, sent.messageId);
                telegram.delivered = true;
                telegram.ok = true;
              } catch (error) {
                await markTelegramNotificationFailed(claimed.id, error, claimed.attempts);
                console.error("[lead.telegram_failed]", error);
              }
            }
          }
        } else {
          const sent = await sendOwnerLeadNotification(lead);
          telegram = { ok: true, configured: true, queued: false, delivered: Boolean(sent.messageId || sent.ok) };
        }
      } catch (error) {
        console.error("[lead.telegram_outbox_failed]", error);
      }
    }

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      message: "Заявка принята",
      telegram,
      persisted: isDatabaseConfigured(),
      requestId,
    });
  } catch (error) {
    console.error("[lead.create_failed]", error);
    return NextResponse.json({ ok: false, code: "LEAD_CREATE_FAILED", message: "Не удалось принять заявку", requestId }, { status: 500 });
  }
}
