-- ARCHITECTURE: Super Calculator foundational data model (stage 03).
-- This migration introduces configuration entities only. It does not change the existing calculator runtime.
-- Business logic remains outside SQL; the future Calculation Engine will consume published model snapshots.
-- Versioned models are immutable by convention once published. Drafts may be edited until publication.

CREATE TABLE IF NOT EXISTS calculator_services (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'geodesy',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calculator_parameters (
  id text PRIMARY KEY,
  service_id text NOT NULL REFERENCES calculator_services(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('number','currency','percentage','boolean','select','multiselect','text','date','range')),
  unit text,
  description text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT false,
  default_value jsonb,
  min_value numeric,
  max_value numeric,
  step numeric,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id,key)
);

CREATE TABLE IF NOT EXISTS calculator_parameter_options (
  id text PRIMARY KEY,
  parameter_id text NOT NULL REFERENCES calculator_parameters(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(parameter_id,value)
);

CREATE TABLE IF NOT EXISTS calculator_rates (
  id text PRIMARY KEY,
  service_id text REFERENCES calculator_services(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  currency text NOT NULL DEFAULT 'KZT',
  region text,
  valid_from date,
  valid_to date,
  source text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calculator_rates_lookup_idx ON calculator_rates(service_id,key,status,valid_from,valid_to);

CREATE TABLE IF NOT EXISTS calculator_coefficients (
  id text PRIMARY KEY,
  service_id text REFERENCES calculator_services(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL DEFAULT 'x',
  region text,
  valid_from date,
  valid_to date,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calculator_coefficients_lookup_idx ON calculator_coefficients(service_id,key,status,valid_from,valid_to);

CREATE TABLE IF NOT EXISTS calculator_formulas (
  id text PRIMARY KEY,
  service_id text REFERENCES calculator_services(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  expression text NOT NULL,
  description text NOT NULL DEFAULT '',
  output_unit text,
  enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id,key)
);

CREATE TABLE IF NOT EXISTS calculator_formula_variables (
  id text PRIMARY KEY,
  formula_id text NOT NULL REFERENCES calculator_formulas(id) ON DELETE CASCADE,
  variable_key text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('parameter','rate','coefficient','constant','formula')),
  source_key text NOT NULL,
  default_value jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(formula_id,variable_key)
);

CREATE TABLE IF NOT EXISTS calculator_scenarios (
  id text PRIMARY KEY,
  service_id text NOT NULL REFERENCES calculator_services(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'quick' CHECK (mode IN ('quick','detailed','unit_economics','commercial','internal')),
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','internal')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  UNIQUE(service_id,key)
);

CREATE TABLE IF NOT EXISTS calculator_cost_items (
  id text PRIMARY KEY,
  service_id text REFERENCES calculator_services(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  cost_type text NOT NULL CHECK (cost_type IN ('labor','transport','equipment','depreciation','materials','software','travel','contractor','processing','overhead','other')),
  unit text NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KZT',
  formula_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  UNIQUE(service_id,key)
);

CREATE TABLE IF NOT EXISTS calculator_unit_economics_models (
  id text PRIMARY KEY,
  service_id text NOT NULL REFERENCES calculator_services(id) ON DELETE CASCADE,
  name text NOT NULL,
  currency text NOT NULL DEFAULT 'KZT',
  margin_target numeric,
  markup_target numeric,
  cac numeric,
  ltv numeric,
  arpu numeric,
  arppu numeric,
  romi numeric,
  payback_period_days numeric,
  overhead_rate numeric,
  tax_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calculator_models (
  id text PRIMARY KEY,
  service_id text NOT NULL REFERENCES calculator_services(id) ON DELETE CASCADE,
  version integer NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  public_enabled boolean NOT NULL DEFAULT true,
  internal_enabled boolean NOT NULL DEFAULT true,
  parameter_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  formula_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  unit_economics_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL DEFAULT 'studio',
  change_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE(service_id,version)
);
CREATE INDEX IF NOT EXISTS calculator_models_service_status_idx ON calculator_models(service_id,status,version DESC);

CREATE TABLE IF NOT EXISTS calculator_model_scenarios (
  model_id text NOT NULL REFERENCES calculator_models(id) ON DELETE CASCADE,
  scenario_id text NOT NULL REFERENCES calculator_scenarios(id) ON DELETE RESTRICT,
  PRIMARY KEY(model_id,scenario_id)
);

CREATE TABLE IF NOT EXISTS calculator_model_unit_economics (
  model_id text PRIMARY KEY REFERENCES calculator_models(id) ON DELETE CASCADE,
  unit_economics_model_id text NOT NULL REFERENCES calculator_unit_economics_models(id) ON DELETE RESTRICT
);

-- Shared updated_at trigger keeps configuration timestamps consistent with the existing CMS convention.
DROP TRIGGER IF EXISTS calculator_services_updated_at ON calculator_services;
CREATE TRIGGER calculator_services_updated_at BEFORE UPDATE ON calculator_services FOR EACH ROW EXECUTE FUNCTION cms_touch_updated_at();
DROP TRIGGER IF EXISTS calculator_parameters_updated_at ON calculator_parameters;
CREATE TRIGGER calculator_parameters_updated_at BEFORE UPDATE ON calculator_parameters FOR EACH ROW EXECUTE FUNCTION cms_touch_updated_at();
DROP TRIGGER IF EXISTS calculator_rates_updated_at ON calculator_rates;
CREATE TRIGGER calculator_rates_updated_at BEFORE UPDATE ON calculator_rates FOR EACH ROW EXECUTE FUNCTION cms_touch_updated_at();
DROP TRIGGER IF EXISTS calculator_coefficients_updated_at ON calculator_coefficients;
CREATE TRIGGER calculator_coefficients_updated_at BEFORE UPDATE ON calculator_coefficients FOR EACH ROW EXECUTE FUNCTION cms_touch_updated_at();
DROP TRIGGER IF EXISTS calculator_formulas_updated_at ON calculator_formulas;
CREATE TRIGGER calculator_formulas_updated_at BEFORE UPDATE ON calculator_formulas FOR EACH ROW EXECUTE FUNCTION cms_touch_updated_at();
DROP TRIGGER IF EXISTS calculator_unit_economics_models_updated_at ON calculator_unit_economics_models;
CREATE TRIGGER calculator_unit_economics_models_updated_at BEFORE UPDATE ON calculator_unit_economics_models FOR EACH ROW EXECUTE FUNCTION cms_touch_updated_at();
