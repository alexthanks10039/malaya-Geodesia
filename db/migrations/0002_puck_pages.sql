-- ARCHITECTURE: Puck page persistence extension.
-- Добавляет хранение структур визуального редактора отдельно от renderer-компонентов.
-- Миграция фиксирует persisted contract и не должна содержать бизнес-логику калькулятора.
ALTER TABLE cms_content DROP CONSTRAINT IF EXISTS cms_content_content_type_check;
ALTER TABLE cms_content ADD CONSTRAINT cms_content_content_type_check CHECK(content_type IN('case','service','knowledge','partner','page'));
CREATE INDEX IF NOT EXISTS cms_page_path_idx ON cms_content(content_type,draft_path) WHERE content_type='page';
