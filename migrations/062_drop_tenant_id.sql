-- Migration 062: Remove tenant_id from all tables and drop tenants table
-- Date: 2026-02-06
--
-- Prerequisites:
--   - Migration 060 (workspace_id added to 13 tables that lacked it)
--   - Migration 061 (FK constraints for workspace_id added)
--   - TypeScript code updated to remove all tenant_id references
--
-- This migration:
--   1. Drops all 37 FK constraints pointing to tenants table
--   2. Drops all 45 indexes that reference tenant_id
--   3. Recreates 7 unique constraints using workspace_id
--   4. Drops tenant_id column from all 40 tables
--   5. Drops the tenants table

BEGIN;

-- ============================================================
-- STEP 1: Drop all FK constraints to tenants table (37 total)
-- ============================================================
ALTER TABLE academy_categories DROP CONSTRAINT IF EXISTS academy_categories_tenant_id_fkey;
ALTER TABLE academy_certificates DROP CONSTRAINT IF EXISTS academy_certificates_tenant_id_fkey;
ALTER TABLE academy_lessons DROP CONSTRAINT IF EXISTS academy_lessons_tenant_id_fkey;
ALTER TABLE academy_modules DROP CONSTRAINT IF EXISTS academy_modules_tenant_id_fkey;
ALTER TABLE academy_progress DROP CONSTRAINT IF EXISTS academy_progress_tenant_id_fkey;
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_tenant_id_fkey;
ALTER TABLE agent_configs DROP CONSTRAINT IF EXISTS agent_configs_tenant_id_fkey;
ALTER TABLE agent_conversation_logs DROP CONSTRAINT IF EXISTS agent_conversation_logs_tenant_id_fkey;
ALTER TABLE conhecimento_base DROP CONSTRAINT IF EXISTS conhecimento_base_tenant_id_fkey;
ALTER TABLE cvcrm_assistencias DROP CONSTRAINT IF EXISTS fk_assistencias_tenant;
ALTER TABLE cvcrm_atendimentos DROP CONSTRAINT IF EXISTS fk_atendimentos_tenant;
ALTER TABLE cvcrm_leads DROP CONSTRAINT IF EXISTS fk_leads_tenant;
ALTER TABLE cvcrm_leads_tarefas DROP CONSTRAINT IF EXISTS fk_tarefas_tenant;
ALTER TABLE cvcrm_snapshots DROP CONSTRAINT IF EXISTS cvcrm_snapshots_tenant_id_fkey;
ALTER TABLE cvcrm_sync_cursors DROP CONSTRAINT IF EXISTS fk_sync_cursors_tenant;
ALTER TABLE cvcrm_sync_logs DROP CONSTRAINT IF EXISTS fk_sync_logs_tenant;
ALTER TABLE dispatch_batches DROP CONSTRAINT IF EXISTS dispatch_batches_tenant_id_fkey;
ALTER TABLE evento_convidados DROP CONSTRAINT IF EXISTS evento_convidados_tenant_id_fkey;
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_tenant_id_fkey;
ALTER TABLE followups DROP CONSTRAINT IF EXISTS followups_tenant_id_fkey;
ALTER TABLE lead_insights DROP CONSTRAINT IF EXISTS lead_insights_tenant_id_fkey;
ALTER TABLE notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tenant_id_fkey;
ALTER TABLE salva_leads_config DROP CONSTRAINT IF EXISTS salva_leads_config_tenant_id_fkey;
ALTER TABLE salva_leads_conversations DROP CONSTRAINT IF EXISTS salva_leads_conversations_tenant_id_fkey;
ALTER TABLE salva_leads_proactive_jobs DROP CONSTRAINT IF EXISTS salva_leads_proactive_jobs_tenant_id_fkey;
ALTER TABLE salva_leads_runs DROP CONSTRAINT IF EXISTS salva_leads_runs_tenant_id_fkey;
ALTER TABLE salva_leads_visitas DROP CONSTRAINT IF EXISTS salva_leads_visitas_tenant_id_fkey;
ALTER TABLE simulacoes DROP CONSTRAINT IF EXISTS simulacoes_tenant_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;
ALTER TABLE visitas_agendadas DROP CONSTRAINT IF EXISTS visitas_agendadas_tenant_id_fkey;
ALTER TABLE whatsapp_campaigns DROP CONSTRAINT IF EXISTS fk_whatsapp_campaigns_tenant;
ALTER TABLE whatsapp_contacts DROP CONSTRAINT IF EXISTS whatsapp_contacts_tenant_id_fkey;
ALTER TABLE whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_tenant_id_fkey;
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_tenant_id_fkey;
ALTER TABLE whatsapp_sync_runs DROP CONSTRAINT IF EXISTS whatsapp_sync_runs_tenant_id_fkey;
ALTER TABLE whatsapp_synced_chats DROP CONSTRAINT IF EXISTS whatsapp_synced_chats_tenant_id_fkey;
ALTER TABLE whatsapp_synced_contacts DROP CONSTRAINT IF EXISTS whatsapp_synced_contacts_tenant_id_fkey;

-- ============================================================
-- STEP 2: Drop unique CONSTRAINTS that use tenant_id (must be
-- dropped as constraints, not indexes)
-- ============================================================
ALTER TABLE academy_categories DROP CONSTRAINT IF EXISTS academy_categories_tenant_id_slug_key;
ALTER TABLE agent_configs DROP CONSTRAINT IF EXISTS agent_configs_tenant_id_instance_name_key;
ALTER TABLE pipeline_leads DROP CONSTRAINT IF EXISTS pipeline_leads_phone_number_tenant_id_key;
ALTER TABLE salva_leads_config DROP CONSTRAINT IF EXISTS salva_leads_config_tenant_id_user_id_key;
ALTER TABLE salva_leads_conversations DROP CONSTRAINT IF EXISTS salva_leads_conversations_tenant_id_atendimento_id_key;
ALTER TABLE whatsapp_synced_chats DROP CONSTRAINT IF EXISTS whatsapp_synced_chats_tenant_id_remote_jid_key;
ALTER TABLE whatsapp_synced_contacts DROP CONSTRAINT IF EXISTS whatsapp_synced_contacts_tenant_id_remote_jid_key;
ALTER TABLE cvcrm_leads_tarefas DROP CONSTRAINT IF EXISTS idx_tarefas_tenant_id_unique;

-- ============================================================
-- STEP 3: Drop remaining indexes that reference tenant_id
-- ============================================================
DROP INDEX IF EXISTS idx_academy_certificates_tenant;
DROP INDEX IF EXISTS idx_academy_lessons_tenant;
DROP INDEX IF EXISTS idx_academy_modules_tenant;
DROP INDEX IF EXISTS idx_academy_progress_tenant;
DROP INDEX IF EXISTS idx_agendamentos_tenant;
DROP INDEX IF EXISTS idx_agent_configs_active;
DROP INDEX IF EXISTS idx_agent_logs_tenant;
DROP INDEX IF EXISTS idx_conhecimento_base_tenant;
DROP INDEX IF EXISTS idx_assistencias_tenant;
DROP INDEX IF EXISTS idx_atendimentos_tenant;
DROP INDEX IF EXISTS idx_leads_tenant;
DROP INDEX IF EXISTS idx_cvcrm_leads_tenant_created;
DROP INDEX IF EXISTS idx_tarefas_tenant_id_unique;
DROP INDEX IF EXISTS idx_tarefas_tenant_lead;
DROP INDEX IF EXISTS idx_cvcrm_snapshots_tenant;
DROP INDEX IF EXISTS idx_sync_cursors_tenant;
DROP INDEX IF EXISTS idx_sync_logs_tenant;
DROP INDEX IF EXISTS idx_dispatch_batches_tenant_evento;
DROP INDEX IF EXISTS idx_evento_convidados_tenant;
DROP INDEX IF EXISTS idx_eventos_tenant;
DROP INDEX IF EXISTS idx_eventos_tenant_status;
DROP INDEX IF EXISTS idx_followups_tenant;
DROP INDEX IF EXISTS idx_lead_insights_tenant;
DROP INDEX IF EXISTS idx_notificacoes_tenant;
DROP INDEX IF EXISTS idx_salva_leads_retry_count;
DROP INDEX IF EXISTS idx_salva_leads_proactive_tenant;
DROP INDEX IF EXISTS idx_slr_tenant;
DROP INDEX IF EXISTS idx_salva_leads_visitas_tenant;
DROP INDEX IF EXISTS idx_simulacoes_tenant;
DROP INDEX IF EXISTS idx_users_tenant_role;
DROP INDEX IF EXISTS idx_users_tenant;
DROP INDEX IF EXISTS idx_visitas_tenant;
DROP INDEX IF EXISTS idx_whatsapp_campaigns_tenant;
DROP INDEX IF EXISTS idx_whatsapp_contacts_tenant;
DROP INDEX IF EXISTS idx_whatsapp_instances_tenant;
DROP INDEX IF EXISTS idx_whatsapp_messages_conversation;
DROP INDEX IF EXISTS idx_whatsapp_messages_tenant;
DROP INDEX IF EXISTS idx_wsr_tenant;

-- ============================================================
-- STEP 4: Recreate unique constraints using workspace_id
-- ============================================================

-- academy_categories: (tenant_id, slug) → (workspace_id, slug)
CREATE UNIQUE INDEX IF NOT EXISTS academy_categories_workspace_slug_key
  ON academy_categories(workspace_id, slug);

-- agent_configs: (tenant_id, instance_name) → (workspace_id, instance_name)
CREATE UNIQUE INDEX IF NOT EXISTS agent_configs_workspace_instance_key
  ON agent_configs(workspace_id, instance_name);

-- pipeline_leads: (phone_number, tenant_id) → (phone_number, workspace_id)
CREATE UNIQUE INDEX IF NOT EXISTS pipeline_leads_phone_workspace_key
  ON pipeline_leads(phone_number, workspace_id);

-- salva_leads_config: (tenant_id, user_id) → (workspace_id, user_id)
CREATE UNIQUE INDEX IF NOT EXISTS salva_leads_config_workspace_user_key
  ON salva_leads_config(workspace_id, user_id);

-- salva_leads_conversations: (tenant_id, atendimento_id) → (workspace_id, atendimento_id)
CREATE UNIQUE INDEX IF NOT EXISTS salva_leads_conversations_workspace_atendimento_key
  ON salva_leads_conversations(workspace_id, atendimento_id);

-- whatsapp_synced_chats: (tenant_id, remote_jid) → (workspace_id, remote_jid)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_synced_chats_workspace_remote_jid_key
  ON whatsapp_synced_chats(workspace_id, remote_jid);

-- whatsapp_synced_contacts: (tenant_id, remote_jid) → (workspace_id, remote_jid)
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_synced_contacts_workspace_remote_jid_key
  ON whatsapp_synced_contacts(workspace_id, remote_jid);

-- Recreate important composite indexes using workspace_id
-- cvcrm_leads: workspace_id + created_at (was tenant_id + created_at)
CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_workspace_created
  ON cvcrm_leads(workspace_id, created_at DESC);

-- cvcrm_leads_tarefas: workspace_id + idtarefa (was unique on tenant_id + idtarefa)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cvcrm_leads_tarefas_workspace_idtarefa
  ON cvcrm_leads_tarefas(workspace_id, idtarefa);

-- cvcrm_leads_tarefas: workspace_id + idlead
CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_tarefas_workspace_lead
  ON cvcrm_leads_tarefas(workspace_id, idlead);

-- dispatch_batches: workspace_id + evento_id (already exists, skip)
-- CREATE INDEX IF NOT EXISTS idx_dispatch_batches_workspace_evento ON dispatch_batches(workspace_id, evento_id);

-- eventos: workspace_id + status
CREATE INDEX IF NOT EXISTS idx_eventos_workspace_status
  ON eventos(workspace_id, status);

-- agent_configs: workspace_id + is_active
CREATE INDEX IF NOT EXISTS idx_agent_configs_workspace_active
  ON agent_configs(workspace_id, is_active);

-- users: workspace_id + role
CREATE INDEX IF NOT EXISTS idx_users_workspace_role
  ON users(workspace_id, role) WHERE (workspace_id IS NOT NULL);

-- whatsapp_messages: workspace_id + phone_number + timestamp
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_workspace_conversation
  ON whatsapp_messages(workspace_id, phone_number, "timestamp" DESC);

-- salva_leads_conversations: workspace_id + retry_count (partial)
CREATE INDEX IF NOT EXISTS idx_salva_leads_workspace_retry
  ON salva_leads_conversations(workspace_id, retry_count) WHERE (retry_count > 0);

-- ============================================================
-- STEP 5: Drop tenant_id from all 40 tables
-- ============================================================
ALTER TABLE academy_categories DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE academy_certificates DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE academy_lessons DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE academy_modules DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE academy_progress DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE agendamentos DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE agent_configs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE agent_conversation_logs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE conhecimento_base DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cvcrm_assistencias DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cvcrm_atendimentos DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cvcrm_leads_interacoes DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cvcrm_leads_tarefas DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cvcrm_snapshots DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cvcrm_sync_cursors DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE cvcrm_sync_logs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE dispatch_batches DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE evento_convidados DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE eventos DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE followups DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE lead_insights DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE notificacoes DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE pipeline_leads DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE salva_leads_config DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE salva_leads_conversations DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE salva_leads_proactive_jobs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE salva_leads_runs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE salva_leads_visitas DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE simulacoes DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE users DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE visitas_agendadas DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE whatsapp_campaigns DROP COLUMN IF EXISTS tenant_id;
-- whatsapp_chats is a VIEW on whatsapp_synced_chats - recreate without tenant_id
DROP VIEW IF EXISTS whatsapp_chats;
CREATE VIEW whatsapp_chats AS
  SELECT id, workspace_id, remote_jid, phone_number, contact_name,
    is_group, last_message_at, last_message_text, last_message_from_me,
    unread_count, total_messages, matched_lead_id, matched_lead_name,
    days_without_response, recovery_potential, suggested_message,
    synced_at, analyzed_at, updated_at
  FROM whatsapp_synced_chats;
ALTER TABLE whatsapp_contacts DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE whatsapp_instances DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE whatsapp_sync_runs DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE whatsapp_synced_chats DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE whatsapp_synced_contacts DROP COLUMN IF EXISTS tenant_id;

-- ============================================================
-- STEP 6: Drop the tenants table
-- ============================================================
DROP TABLE IF EXISTS tenants CASCADE;

COMMIT;

-- Verification
SELECT 'Tables still with tenant_id' as check_type,
  count(*) as count
FROM information_schema.columns
WHERE table_schema='public' AND column_name='tenant_id';
