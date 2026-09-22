import { NextResponse } from "next/server";

const allowedTypes = new Set([
  "Топографическая съёмка",
  "Исполнительная съёмка",
  "Аэрофотосъёмка",
  "Лазерное сканирование",
  "3D-моделирование",
  "Расчёт объёмов",
]);

const allowedOutputs = new Set(["DWG", "PDF", "GeoTIFF", "LAS/LAZ", "E57", "OBJ", "Не знаю"]);
const allowedUrgencies = new Set(["Обычный срок", "Срочно", "Очень срочно"]);
const allowedConditions = new Set(["Лес", "Сложный рельеф", "Плотная застройка", "ЛЭП", "Удалённость"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const type = typeof body?.type === "string" ? body.type : "";
    const output = typeof body?.output === "string" ? body.output : "";
    const urgency = typeof body?.urgency === "string" ? body.urgency : "";
    const area = Number(body?.area);
    const complexity = Array.isArray(body?.complexity) ? body.complexity : [];

    if (!phone) {
      return NextResponse.json({ ok: false, message: "Укажите телефон" }, { status: 400 });
    }

    if (phone.replace(/[^+\d]/g, "").length < 10) {
      return NextResponse.json({ ok: false, message: "Проверьте номер телефона" }, { status: 400 });
    }

    if (!allowedTypes.has(type)) {
      return NextResponse.json({ ok: false, message: "Выберите тип работы" }, { status: 400 });
    }

    if (!Number.isFinite(area) || area < 100 || area > 500000) {
      return NextResponse.json({ ok: false, message: "Площадь должна быть от 100 до 500 000 м²" }, { status: 400 });
    }

    if (!allowedOutputs.has(output)) {
      return NextResponse.json({ ok: false, message: "Выберите формат результата" }, { status: 400 });
    }

    if (!allowedUrgencies.has(urgency)) {
      return NextResponse.json({ ok: false, message: "Выберите срок выполнения" }, { status: 400 });
    }

    if (!complexity.every((item) => typeof item === "string" && allowedConditions.has(item))) {
      return NextResponse.json({ ok: false, message: "Некорректные условия объекта" }, { status: 400 });
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
