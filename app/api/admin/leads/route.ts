import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import {
  getLeadById,
  getLeadStats,
  listLeads,
  updateLeadStatus,
  reassignLead,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/telegram-leads";

export const dynamic = "force-dynamic";

function guard() {
  return requireAdminApi();
}

const validStatuses = new Set<string>(Object.values(LEAD_STATUSES));

export async function GET(request: Request) {
  const auth = await guard();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (id) {
    const lead = await getLeadById(id);
    return lead
      ? NextResponse.json({ ok: true, lead })
      : NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Lead not found" }, { status: 404 });
  }

  const status = url.searchParams.get("status")?.trim() || undefined;
  if (status && !validStatuses.has(status)) {
    return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Invalid lead status" }, { status: 400 });
  }

  const limit = Number(url.searchParams.get("limit") || 50);
  const offset = Number(url.searchParams.get("offset") || 0);
  if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || limit > 100 || offset < 0) {
    return NextResponse.json({ ok: false, code: "INVALID_PAGINATION", message: "Invalid pagination" }, { status: 400 });
  }

  const [leads, stats] = await Promise.all([
    listLeads({ status: status as LeadStatus | undefined, limit, offset }),
    getLeadStats(),
  ]);

  return NextResponse.json({ ok: true, leads, stats, limit, offset });
}

export async function PATCH(request: Request) {
  const auth = await guard();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const leadId = typeof body?.leadId === "string" ? body.leadId.trim() : "";
    const actor = typeof body?.actor === "string" ? body.actor.trim().slice(0, 120) : "studio";

    if (!leadId) {
      return NextResponse.json({ ok: false, code: "INVALID_LEAD_ID", message: "leadId is required" }, { status: 400 });
    }

    if (typeof body?.status === "string") {
      if (!validStatuses.has(body.status)) {
        return NextResponse.json({ ok: false, code: "INVALID_STATUS", message: "Invalid lead status" }, { status: 400 });
      }
      const lead = await updateLeadStatus({ leadId, status: body.status as LeadStatus, by: actor });
      if (!lead) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Lead not found" }, { status: 404 });
      return NextResponse.json({ ok: true, lead });
    }

    if (body?.assignedTo && typeof body.assignedTo === "object") {
      const employeeId = typeof body.assignedTo.id === "string" ? body.assignedTo.id.trim().slice(0, 120) : "";
      const employeeName = typeof body.assignedTo.name === "string" ? body.assignedTo.name.trim().slice(0, 160) : "";
      if (!employeeId || !employeeName) {
        return NextResponse.json({ ok: false, code: "INVALID_ASSIGNEE", message: "assignedTo.id and assignedTo.name are required" }, { status: 400 });
      }
      const lead = await reassignLead({ leadId, employeeId, employeeName, by: actor });
      if (!lead) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Lead not found" }, { status: 404 });
      return NextResponse.json({ ok: true, lead });
    }

    return NextResponse.json({ ok: false, code: "NO_CHANGE", message: "No supported lead change supplied" }, { status: 400 });
  } catch (error) {
    console.error("[admin.leads_patch_failed]", error);
    return NextResponse.json({ ok: false, code: "LEAD_UPDATE_FAILED", message: "Lead update failed" }, { status: 500 });
  }
}
