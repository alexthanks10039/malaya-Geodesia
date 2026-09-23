import { isDatabaseConfigured, query, withTransaction } from "@/lib/db";

export const LEAD_STATUSES = {
  NEW: "new",
  IN_WORK: "in_work",
  REASSIGNED: "reassigned",
  DONE: "done",
  CANCELLED: "cancelled",
} as const;

export type LeadStatus = (typeof LEAD_STATUSES)[keyof typeof LEAD_STATUSES];
export type LeadRecord = {
  id: string;
  phone: string;
  type: string;
  area?: number;
  complexity?: string[];
  output?: string;
  urgency?: string;
  estimate?: Record<string, unknown> | null;
  source?: string;
  sourcePage?: string;
  status: LeadStatus;
  assignedTo?: { id: string; name: string } | null;
  history?: Array<{ action: string; at: string; by: string }>;
  createdAt: string;
  updatedAt?: string;
};

const memory = new Map<string, LeadRecord>();

const statusValues = new Set<string>(Object.values(LEAD_STATUSES));

function normalize(row: Record<string, any>): LeadRecord {
  return {
    id: String(row.id),
    phone: String(row.phone || ""),
    type: String(row.type || ""),
    area: row.area == null ? undefined : Number(row.area),
    complexity: Array.isArray(row.complexity) ? row.complexity : [],
    output: row.output || "",
    urgency: row.urgency || "",
    estimate: row.estimate && typeof row.estimate === "object" ? row.estimate : null,
    source: row.source || "website",
    sourcePage: row.source_page || "",
    status: statusValues.has(row.status) ? row.status : LEAD_STATUSES.NEW,
    assignedTo: row.assigned_to || null,
    history: Array.isArray(row.history) ? row.history : [],
    createdAt: new Date(row.created_at || Date.now()).toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

function fallbackCreate(lead: Omit<LeadRecord, "status"> & { status?: LeadStatus }) {
  const now = new Date().toISOString();
  const record: LeadRecord = {
    ...lead,
    id: lead.id || `GEO-${Date.now()}`,
    status: lead.status || LEAD_STATUSES.NEW,
    history: [{ action: "created", at: now, by: "website" }],
    createdAt: lead.createdAt || now,
  };
  memory.set(record.id, record);
  return record;
}

export async function createLeadRecord(lead: Omit<LeadRecord, "status"> & { status?: LeadStatus }) {
  if (!isDatabaseConfigured()) return fallbackCreate(lead);
  const record = fallbackCreate(lead);
  try {
    const result = await query<Record<string, any>>(
      `INSERT INTO geo_leads
        (id,phone,type,area,complexity,output,urgency,estimate,source,source_page,status,history,created_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10,$11,$12::jsonb,$13)
       ON CONFLICT (id) DO UPDATE SET
         phone=EXCLUDED.phone,type=EXCLUDED.type,area=EXCLUDED.area,complexity=EXCLUDED.complexity,
         output=EXCLUDED.output,urgency=EXCLUDED.urgency,estimate=EXCLUDED.estimate,
         source=EXCLUDED.source,source_page=EXCLUDED.source_page,status=EXCLUDED.status,history=EXCLUDED.history
       RETURNING *`,
      [
        record.id, record.phone, record.type, record.area ?? null,
        JSON.stringify(record.complexity || []), record.output || null, record.urgency || null,
        JSON.stringify(record.estimate || null), record.source || "website", record.sourcePage || null,
        record.status, JSON.stringify(record.history || []), record.createdAt,
      ],
    );
    const persisted = result.rows[0] ? normalize(result.rows[0]) : record;
    memory.set(persisted.id, persisted);
    return persisted;
  } catch (error) {
    console.error("[leads.db_create_failed]", error);
    return record;
  }
}

export async function getLeadById(id: string) {
  if (!isDatabaseConfigured()) return memory.get(id) || null;
  try {
    const result = await query<Record<string, any>>("SELECT * FROM geo_leads WHERE id=$1 LIMIT 1", [id]);
    if (!result.rows[0]) return memory.get(id) || null;
    const record = normalize(result.rows[0]);
    memory.set(record.id, record);
    return record;
  } catch (error) {
    console.error("[leads.db_get_failed]", error);
    return memory.get(id) || null;
  }
}

export async function getLeadsByStatus(status: LeadStatus) {
  if (!isDatabaseConfigured()) {
    return [...memory.values()]
      .filter((lead) => lead.status === status)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  try {
    const result = await query<Record<string, any>>(
      "SELECT * FROM geo_leads WHERE status=$1 ORDER BY created_at DESC LIMIT 50",
      [status],
    );
    const records = result.rows.map(normalize);
    records.forEach((record) => memory.set(record.id, record));
    return records;
  } catch (error) {
    console.error("[leads.db_list_failed]", error);
    return [...memory.values()].filter((lead) => lead.status === status);
  }
}

export async function getLeadStats() {
  if (!isDatabaseConfigured()) {
    const all = [...memory.values()];
    return {
      total: all.length,
      new: all.filter((x) => x.status === LEAD_STATUSES.NEW).length,
      inWork: all.filter((x) => x.status === LEAD_STATUSES.IN_WORK).length,
      done: all.filter((x) => x.status === LEAD_STATUSES.DONE).length,
      reassigned: all.filter((x) => x.status === LEAD_STATUSES.REASSIGNED).length,
      cancelled: all.filter((x) => x.status === LEAD_STATUSES.CANCELLED).length,
    };
  }
  try {
    const result = await query<{ status: string; count: string }>(
      "SELECT status, count(*)::text AS count FROM geo_leads GROUP BY status",
    );
    const stats = { total: 0, new: 0, inWork: 0, done: 0, reassigned: 0, cancelled: 0 };
    for (const row of result.rows) {
      const count = Number(row.count);
      stats.total += count;
      if (row.status === "new") stats.new = count;
      if (row.status === "in_work") stats.inWork = count;
      if (row.status === "done") stats.done = count;
      if (row.status === "reassigned") stats.reassigned = count;
      if (row.status === "cancelled") stats.cancelled = count;
    }
    return stats;
  } catch (error) {
    console.error("[leads.db_stats_failed]", error);
    return getLeadStatsMemory();
  }
}

function getLeadStatsMemory() {
  const all = [...memory.values()];
  return {
    total: all.length,
    new: all.filter((x) => x.status === LEAD_STATUSES.NEW).length,
    inWork: all.filter((x) => x.status === LEAD_STATUSES.IN_WORK).length,
    done: all.filter((x) => x.status === LEAD_STATUSES.DONE).length,
    reassigned: all.filter((x) => x.status === LEAD_STATUSES.REASSIGNED).length,
    cancelled: all.filter((x) => x.status === LEAD_STATUSES.CANCELLED).length,
  };
}

export async function updateLeadStatus({ leadId, status, by }: { leadId: string; status: LeadStatus; by: string }) {
  if (!statusValues.has(status)) throw new Error("Invalid lead status");
  const current = await getLeadById(leadId);
  if (!current) return null;
  const at = new Date().toISOString();
  const history = [...(current.history || []), { action: `status:${status}`, at, by }];
  const next = { ...current, status, updatedAt: at, history };
  memory.set(leadId, next);
  if (!isDatabaseConfigured()) return next;
  const result = await query<Record<string, any>>(
    "UPDATE geo_leads SET status=$1,history=$2::jsonb WHERE id=$3 RETURNING *",
    [status, JSON.stringify(history), leadId],
  );
  return result.rows[0] ? normalize(result.rows[0]) : next;
}

export async function reassignLead({ leadId, employeeId, employeeName, by }: { leadId: string; employeeId: string; employeeName: string; by: string }) {
  const current = await getLeadById(leadId);
  if (!current) return null;
  const at = new Date().toISOString();
  const assignedTo = { id: employeeId, name: employeeName };
  const history = [...(current.history || []), { action: `reassigned:${employeeName}`, at, by }];
  const next = { ...current, status: LEAD_STATUSES.REASSIGNED, assignedTo, updatedAt: at, history };
  memory.set(leadId, next);
  if (!isDatabaseConfigured()) return next;
  const result = await query<Record<string, any>>(
    "UPDATE geo_leads SET status=$1,assigned_to=$2::jsonb,history=$3::jsonb WHERE id=$4 RETURNING *",
    [LEAD_STATUSES.REASSIGNED, JSON.stringify(assignedTo), JSON.stringify(history), leadId],
  );
  return result.rows[0] ? normalize(result.rows[0]) : next;
}
