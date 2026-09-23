CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id bigint PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  processing_at timestamptz,
  processed_at timestamptz,
  last_error text
);

CREATE INDEX IF NOT EXISTS telegram_updates_processed_idx
  ON telegram_updates(processed_at, received_at DESC);
