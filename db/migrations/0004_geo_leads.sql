CREATE TABLE IF NOT EXISTS geo_leads (
  id text PRIMARY KEY,
  phone text NOT NULL,
  type text NOT NULL,
  area numeric,
  complexity jsonb NOT NULL DEFAULT '[]'::jsonb,
  output text,
  urgency text,
  estimate jsonb,
  source text NOT NULL DEFAULT 'website',
  source_page text,
  status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_work','reassigned','done','cancelled')),
  assigned_to jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS geo_leads_status_idx ON geo_leads(status);
CREATE INDEX IF NOT EXISTS geo_leads_created_idx ON geo_leads(created_at DESC);
CREATE OR REPLACE FUNCTION geo_leads_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS geo_leads_updated_at ON geo_leads;
CREATE TRIGGER geo_leads_updated_at BEFORE UPDATE ON geo_leads FOR EACH ROW EXECUTE FUNCTION geo_leads_touch_updated_at();