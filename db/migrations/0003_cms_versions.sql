-- ARCHITECTURE: CMS versioning/audit extension.
-- Добавляет immutable-ish snapshots и историю изменений для draft/published workflow.
-- Версионирование хранится в БД, чтобы rollback не зависел от состояния браузера.
CREATE TABLE IF NOT EXISTS cms_content_versions(
 id bigserial PRIMARY KEY,
 content_id text NOT NULL,
 content_type text NOT NULL,
 version integer NOT NULL,
 action text NOT NULL,
 slug text NOT NULL,
 path text NOT NULL,
 status text NOT NULL,
 draft_data jsonb,
 published_data jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(content_id,version)
);
CREATE INDEX IF NOT EXISTS cms_content_versions_content_idx ON cms_content_versions(content_id,created_at DESC);

INSERT INTO cms_content_versions(content_id,content_type,version,action,slug,path,status,draft_data,published_data,created_at)
SELECT id,content_type,version,'migration',draft_slug,draft_path,status,draft_data,published_data,updated_at FROM cms_content
ON CONFLICT(content_id,version) DO NOTHING;
