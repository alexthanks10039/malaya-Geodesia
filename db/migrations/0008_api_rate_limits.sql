CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_updated_idx
  ON api_rate_limits(updated_at);
