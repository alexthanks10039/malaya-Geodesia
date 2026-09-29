/**
 * ARCHITECTURE: Admin API boundary.
 * Отвечает за HTTP-контракт Studio, валидацию входа, авторизацию и вызов backend/domain-слоя.
 * Бизнес-правила и расчётная математика не должны жить в route.ts.
 * Response формируется явно, чтобы внутренние поля БД не утекали в клиентский контур.
 */

import { NextResponse } from "next/server";
import { createAdminSession, loginAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (!(await loginAdmin(""))) {
      return NextResponse.json(
        { ok: false, message: "Studio auth is disabled" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    await createAdminSession();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Studio auth is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
