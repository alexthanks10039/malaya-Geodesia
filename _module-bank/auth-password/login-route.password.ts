import { NextResponse } from "next/server";
import { createAdminSession, loginAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    if (!(await loginAdmin(String(body.password ?? "")))) {
      return NextResponse.json({ ok: false, message: "Invalid password" }, { status: 401 });
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
