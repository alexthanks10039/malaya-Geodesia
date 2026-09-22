import { NextResponse } from "next/server";

const allowedUrgencies = new Set(["Обычный срок", "Срочно", "Очень срочно"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const area = Number(body?.area);

    if (!phone) {
      return NextResponse.json({ ok: false, message: "Укажите телефон" }, { status: 400 });
    }

    if (phone.replace(/[^+\d]/g, "").length < 10) {
      return NextResponse.json({ ok: false, message: "Проверьте номер телефона" }, { status: 400 });
    }

    if (!Number.isFinite(area) || area < 100) {
      return NextResponse.json({ ok: false, message: "Площадь должна быть не меньше 100 м²" }, { status: 400 });
    }

    if (body?.urgency && !allowedUrgencies.has(body.urgency)) {
      return NextResponse.json({ ok: false, message: "Некорректный срок выполнения" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      leadId: `GEO-${Date.now()}`,
      message: "Заявка принята",
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Некорректный запрос" }, { status: 400 });
  }
}
