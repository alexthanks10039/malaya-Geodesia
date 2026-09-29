/**
 * ARCHITECTURE: Admin API boundary.
 * Отвечает за HTTP-контракт Studio, валидацию входа, авторизацию и вызов backend/domain-слоя.
 * Бизнес-правила и расчётная математика не должны жить в route.ts.
 * Response формируется явно, чтобы внутренние поля БД не утекали в клиентский контур.
 */

import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAdminSession();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
