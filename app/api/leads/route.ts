import { NextResponse } from "next/server";
import { defaultCalculatorStudioConfig } from "@/studio/config/calculator";

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

    if (!phone) {
      return NextResponse.json({ ok: false, message: "Укажите телефон" }, { status: 400 });
    }

    const normalizedPhone = phone.replace(/[^+\d]/g, "");
    if (normalizedPhone.length < 10 || normalizedPhone.length > 16) {
      return NextResponse.json({ ok: false, message: "Проверьте номер телефона" }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ ok: false, message: "Выберите тип работы" }, { status: 400 });
    }

    if (!Number.isFinite(area) ||
      area < defaultCalculatorStudioConfig.pricing.minArea ||
      area > defaultCalculatorStudioConfig.pricing.maxArea) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Площадь должна быть от " +
            defaultCalculatorStudioConfig.pricing.minArea.toLocaleString("ru-RU") +
            " до " +
            defaultCalculatorStudioConfig.pricing.maxArea.toLocaleString("ru-RU") +
            " м²",
        },
        { status: 400 },
      );
    }

    if (!output) {
      return NextResponse.json({ ok: false, message: "Выберите формат результата" }, { status: 400 });
    }

    if (!urgency) {
      return NextResponse.json({ ok: false, message: "Выберите срок выполнения" }, { status: 400 });
    }

    if (complexity.length !== complexityValue.length || complexity.length > 20) {
      return NextResponse.json({ ok: false, message: "Некорректные условия объекта" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      leadId: "GEO-" + Date.now(),
      message: "Заявка принята",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Некорректный запрос" }, { status: 400 });
  }
}
