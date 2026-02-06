-- Migration 073: Tighten workspace_id constraints
-- Date: 2026-02-06
--
-- A. Remove duplicate FK on workspace_members (keep standard _fkey naming)
-- B. Remove DEFAULT 1 from 8 tables (force explicit workspace_id)
-- C. Convert workspace_id from NULLABLE to NOT NULL on 42 tables (all verified zero NULLs)
--
-- Skipped tables (handled in migration 070):
--   imobiliarias, whatsapp_synced_contacts, recepcao_feriados, conversations, hierarquias
--
-- Verification query used before writing this migration:
--   All 42 nullable tables confirmed to have 0 NULL workspace_id rows.

BEGIN;

-- ============================================================
-- A. Remove duplicate FK on workspace_members
-- ============================================================
-- workspace_members has two FK constraints for workspace_id:
--   1. workspace_members_workspace_id_fkey (standard naming, keep)
--   2. fk_workspace_members_workspace (non-standard naming, drop)
ALTER TABLE workspace_members
  DROP CONSTRAINT fk_workspace_members_workspace;

-- ============================================================
-- B. Remove DEFAULT 1 from workspace_id on 8 tables
-- ============================================================
-- DEFAULT 1 silently assigns workspace 1 when code forgets to pass workspace_id.
-- This is dangerous in multi-tenant — better to fail loudly with a NOT NULL violation.
ALTER TABLE academy_categories      ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE academy_certificates    ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE academy_lessons         ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE academy_modules         ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE academy_progress        ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE agendamentos            ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE agent_conversation_logs ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE salva_leads_config      ALTER COLUMN workspace_id DROP DEFAULT;

-- ============================================================
-- C. Convert NULLABLE workspace_id to NOT NULL (42 tables)
-- ============================================================
-- All tables below have been verified to contain zero NULL workspace_id rows.
-- Grouped by domain for readability.

-- --- CV CRM tables ---
ALTER TABLE cvcrm_leads                  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_lead_interacoes        ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_leads_interacoes       ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_leads_tarefas          ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_reservas               ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_assistencias           ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_atendimentos           ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_atendimentos_arquivos  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_snapshots              ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_sync_cursors           ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_sync_logs              ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_venda_simulacoes       ALTER COLUMN workspace_id SET NOT NULL;

-- --- WhatsApp tables ---
ALTER TABLE whatsapp_messages        ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE whatsapp_contacts        ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE whatsapp_instances       ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE whatsapp_campaigns       ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE whatsapp_sync_runs       ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE whatsapp_synced_chats    ALTER COLUMN workspace_id SET NOT NULL;

-- --- Leads & Pipeline tables ---
ALTER TABLE leads                ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE leads_interactions   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE lead_insights        ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE pipeline_leads       ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE funnels              ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE funnel_stages        ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE followups            ALTER COLUMN workspace_id SET NOT NULL;

-- --- Campaigns & Dispatch tables ---
ALTER TABLE campaigns        ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE campaign_leads   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE dispatch_batches ALTER COLUMN workspace_id SET NOT NULL;

-- --- Salva-Leads tables ---
ALTER TABLE salva_leads_conversations   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE salva_leads_proactive_jobs  ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE salva_leads_runs            ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE salva_leads_visitas         ALTER COLUMN workspace_id SET NOT NULL;

-- --- Events tables ---
ALTER TABLE eventos             ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE evento_convidados   ALTER COLUMN workspace_id SET NOT NULL;

-- --- Other tables ---
ALTER TABLE users               ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE automations         ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE notificacoes        ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE activities          ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE agent_configs       ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE conhecimento_base   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE simulacoes          ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE visitas_agendadas   ALTER COLUMN workspace_id SET NOT NULL;

COMMIT;
