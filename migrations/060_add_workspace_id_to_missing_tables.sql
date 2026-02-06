-- Migration 060: Add workspace_id to 13 tables that only have tenant_id
-- Date: 2026-02-06
--
-- These tables were created with the old tenant_id pattern but never
-- received the workspace_id column during the migration to workspace-based isolation.
-- All existing data has tenant_id = 1 → workspace_id = 1 (Admin Workspace)
--
-- Tables affected:
--   academy_categories, academy_certificates, academy_lessons, academy_modules,
--   academy_progress, agendamentos, agent_conversation_logs, conhecimento_base,
--   lead_insights, pipeline_leads, salva_leads_config, salva_leads_proactive_jobs,
--   salva_leads_visitas

BEGIN;

-- Step 1: Add workspace_id column (nullable first) to all 13 tables
ALTER TABLE academy_categories ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE academy_certificates ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE academy_lessons ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE academy_modules ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE academy_progress ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE agent_conversation_logs ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE conhecimento_base ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE lead_insights ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE salva_leads_config ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE salva_leads_proactive_jobs ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE salva_leads_visitas ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- Step 2: Populate workspace_id from tenant_id (tenant 1 → workspace 1)
UPDATE academy_categories SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE academy_certificates SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE academy_lessons SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE academy_modules SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE academy_progress SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE agendamentos SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE agent_conversation_logs SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE conhecimento_base SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE lead_insights SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE pipeline_leads SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE salva_leads_config SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE salva_leads_proactive_jobs SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;
UPDATE salva_leads_visitas SET workspace_id = COALESCE(tenant_id, 1) WHERE workspace_id IS NULL;

-- Step 3: Set NOT NULL on tables that had NOT NULL on tenant_id
ALTER TABLE academy_categories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE academy_certificates ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE academy_lessons ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE academy_modules ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE academy_progress ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE agendamentos ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE agent_conversation_logs ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE salva_leads_config ALTER COLUMN workspace_id SET NOT NULL;

-- Step 4: Set default for workspace_id (same as tenant_id had default of 1 in many cases)
ALTER TABLE academy_categories ALTER COLUMN workspace_id SET DEFAULT 1;
ALTER TABLE academy_certificates ALTER COLUMN workspace_id SET DEFAULT 1;
ALTER TABLE academy_lessons ALTER COLUMN workspace_id SET DEFAULT 1;
ALTER TABLE academy_modules ALTER COLUMN workspace_id SET DEFAULT 1;
ALTER TABLE academy_progress ALTER COLUMN workspace_id SET DEFAULT 1;
ALTER TABLE agendamentos ALTER COLUMN workspace_id SET DEFAULT 1;
ALTER TABLE agent_conversation_logs ALTER COLUMN workspace_id SET DEFAULT 1;
ALTER TABLE salva_leads_config ALTER COLUMN workspace_id SET DEFAULT 1;

COMMIT;

-- Verification
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema='public'
AND column_name = 'workspace_id'
AND table_name IN (
  'academy_categories','academy_certificates','academy_lessons','academy_modules',
  'academy_progress','agendamentos','agent_conversation_logs','conhecimento_base',
  'lead_insights','pipeline_leads','salva_leads_config','salva_leads_proactive_jobs',
  'salva_leads_visitas'
)
ORDER BY table_name;
