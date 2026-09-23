import { isDatabaseConfigured, query, withTransaction } from "@/lib/db";

export type TelegramNotification = {
  id: number;
  leadId: string;
  kind: "owner_lead";
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  lastError: string | null;
  telegramMessageId: number | null;
  nextAttemptAt: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
};

function mapRow(row: Record<string, any>): TelegramNotification {
  return {
    id: Number(row.id),
    leadId: String(row.lead_id),
    kind: row.kind,
    status: row.status,
    attempts: Number(row.attempts || 0),
    lastError: row.last_error || null,
    telegramMessageId: row.telegram_message_id == null ? null : Number(row.telegram_message_id),
    nextAttemptAt: new Date(row.next_attempt_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
  };
}

export async function enqueueLeadNotification(leadId: string) {
  if (!isDatabaseConfigured()) return null;
  const result = await query<Record<string, any>>(
    `INSERT INTO telegram_notifications(lead_id, kind)
     VALUES($1, 'owner_lead')
     ON CONFLICT(lead_id, kind) DO NOTHING
     RETURNING *`,
    [leadId],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function claimNextTelegramNotification() {
  if (!isDatabaseConfigured()) return null;
  return withTransaction(async (client) => {
    const result = await client.query<Record<string, any>>(
      `UPDATE telegram_notifications
       SET status='processing', attempts=attempts+1
       WHERE id = (
         SELECT id
         FROM telegram_notifications
         WHERE status IN ('pending','failed')
           AND next_attempt_at <= now()
         ORDER BY next_attempt_at, id
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       RETURNING *`,
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  });
}

export async function markTelegramNotificationSent(id: number, telegramMessageId?: number) {
  if (!isDatabaseConfigured()) return;
  await query(
    `UPDATE telegram_notifications
     SET status='sent', sent_at=now(), telegram_message_id=$2, last_error=NULL
     WHERE id=$1`,
    [id, telegramMessageId ?? null],
  );
}

export async function markTelegramNotificationFailed(id: number, error: unknown, attempts: number) {
  if (!isDatabaseConfigured()) return;
  const delaySeconds = Math.min(3600, Math.max(15, 15 * 2 ** Math.min(attempts - 1, 7)));
  await query(
    `UPDATE telegram_notifications
     SET status='failed',
         last_error=$2,
         next_attempt_at=now() + ($3 * interval '1 second')
     WHERE id=$1`,
    [id, error instanceof Error ? error.message.slice(0, 500) : "Telegram notification failed", delaySeconds],
  );
}

export async function getTelegramNotification(leadId: string) {
  if (!isDatabaseConfigured()) return null;
  const result = await query<Record<string, any>>(
    "SELECT * FROM telegram_notifications WHERE lead_id=$1 AND kind='owner_lead' LIMIT 1",
    [leadId],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}
