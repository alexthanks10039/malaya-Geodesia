ALTER TABLE geo_leads
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS geo_leads_idempotency_key_uq
  ON geo_leads(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
