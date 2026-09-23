CREATE TABLE IF NOT EXISTS telegram_notifications (
  id bigserial PRIMARY KEY,
  lead_id text NOT NULL REFERENCES geo_leads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'owner_lead',
  status text NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','processing','sent','failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  telegram_message_id bigint,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE(lead_id, kind)
);

CREATE INDEX IF NOT EXISTS telegram_notifications_retry_idx
  ON telegram_notifications(status, next_attempt_at);

CREATE OR REPLACE FUNCTION telegram_notifications_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS telegram_notifications_updated_at ON telegram_notifications;
CREATE TRIGGER telegram_notifications_updated_at
BEFORE UPDATE ON telegram_notifications
FOR EACH ROW EXECUTE FUNCTION telegram_notifications_touch_updated_at();
