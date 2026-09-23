import { NextResponse } from "next/server";
import { createLeadRecord } from "@/lib/telegram-leads";
import { sendOwnerLeadNotification } from "@/lib/telegram";

const MAX_TEXT_LENGTH = 160;

function text(value: unknown, max = MAX_TEXT_LENGTH): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, message: "Некорректный запрос" }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
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
    });

    let telegram = { ok: false, configured: Boolean(process.env.TG_KEY && process.env.OWNER_ID) };
    if (telegram.configured) {
      try {
        await sendOwnerLeadNotification(lead);
        telegram = { ok: true, configured: true };
      } catch (error) {
        console.error("[lead.telegram_failed]", error);
      }
    }

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      message: "Заявка принята",
      telegram,
      persisted: Boolean(process.env.DATABASE_URL),
    });
  } catch (error) {
    console.error("[lead.create_failed]", error);
    return NextResponse.json({ ok: false, message: "Не удалось принять заявку" }, { status: 500 });
  }
}
