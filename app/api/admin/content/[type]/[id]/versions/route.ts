import { NextResponse } from "next/server";
import { getContentVersion, isContentType, listContentVersions, rollbackContent } from "@/lib/cms";
import { requireAdminApi } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { type, id } = await params;
  if (!isContentType(type)) return NextResponse.json({ ok: false, message: "Unknown content type" }, { status: 404 });
  const url = new URL(request.url);
  const rawVersion = url.searchParams.get("version");
  if (rawVersion) {
    const version = Number(rawVersion);
    if (!Number.isInteger(version) || version < 1) return NextResponse.json({ ok: false, message: "Invalid version" }, { status: 400 });
    const item = await getContentVersion(id, type, version);
    return item ? NextResponse.json({ ok: true, item }) : NextResponse.json({ ok: false, message: "Version not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, items: await listContentVersions(id, type) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { type, id } = await params;
  if (!isContentType(type)) return NextResponse.json({ ok: false, message: "Unknown content type" }, { status: 404 });
  const body = await request.json() as { version?: number; expectedVersion?: number };
  if (!Number.isInteger(body.version) || Number(body.version) < 1) {
    return NextResponse.json({ ok: false, message: "Invalid version" }, { status: 400 });
  }
  try {
    const item = await rollbackContent(id, type, Number(body.version), typeof body.expectedVersion === "number" ? body.expectedVersion : undefined);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rollback failed";
    const status = message.includes("Version conflict") ? 409 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
