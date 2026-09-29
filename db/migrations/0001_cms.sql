-- ARCHITECTURE: Initial CMS persistence contract.
-- Определяет базовые таблицы контента, поэтому изменение схемы должно быть backward-compatible с существующим runtime.
-- UI не зависит от структуры напрямую: доступ идёт через lib/cms.ts.
CREATE TABLE IF NOT EXISTS cms_migrations(id text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS cms_content(
 id text PRIMARY KEY,
 content_type text NOT NULL CHECK(content_type IN('case','service','knowledge','partner')),
 draft_slug text NOT NULL,
 draft_path text NOT NULL UNIQUE,
 published_slug text,
 published_path text UNIQUE,
 draft_data jsonb NOT NULL DEFAULT '{}'::jsonb,
 published_data jsonb,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published','changes')),
 version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz
);
CREATE INDEX IF NOT EXISTS cms_content_type_idx ON cms_content(content_type);
CREATE INDEX IF NOT EXISTS cms_content_status_idx ON cms_content(status);
CREATE INDEX IF NOT EXISTS cms_content_updated_idx ON cms_content(updated_at DESC);
CREATE TABLE IF NOT EXISTS file_assets(
 id text PRIMARY KEY,
 pathname text NOT NULL UNIQUE,
 url text NOT NULL UNIQUE,
 filename text NOT NULL,
 content_type text NOT NULL DEFAULT 'application/octet-stream',
 size bigint NOT NULL DEFAULT 0,
 folder text NOT NULL DEFAULT 'studio',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS file_assets_folder_idx ON file_assets(folder);
CREATE INDEX IF NOT EXISTS file_assets_created_idx ON file_assets(created_at DESC);
CREATE TABLE IF NOT EXISTS cms_audit_log(
 id bigserial PRIMARY KEY,
 entity_type text NOT NULL,
 entity_id text NOT NULL,
 action text NOT NULL,
 actor text NOT NULL DEFAULT 'studio',
 before_data jsonb,
 after_data jsonb,
 metadata jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cms_audit_entity_idx ON cms_audit_log(entity_type,entity_id,created_at DESC);
CREATE INDEX IF NOT EXISTS cms_audit_created_idx ON cms_audit_log(created_at DESC);
CREATE OR REPLACE FUNCTION cms_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS cms_content_updated_at ON cms_content;
CREATE TRIGGER cms_content_updated_at BEFORE UPDATE ON cms_content FOR EACH ROW EXECUTE FUNCTION cms_touch_updated_at();