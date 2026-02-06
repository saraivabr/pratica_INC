-- Migration 063: Add workspace_id indexes to tables that lack them
-- Date: 2026-02-06
--
-- 27 tables have workspace_id but no index on it.
-- Adding basic workspace_id indexes for query performance.

BEGIN;

-- Academy
CREATE INDEX IF NOT EXISTS idx_academy_certificates_workspace ON academy_certificates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_academy_lessons_workspace ON academy_lessons(workspace_id);
CREATE INDEX IF NOT EXISTS idx_academy_modules_workspace ON academy_modules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_academy_progress_workspace ON academy_progress(workspace_id);

-- General
CREATE INDEX IF NOT EXISTS idx_activities_workspace ON activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_workspace ON agendamentos(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversation_logs_workspace ON agent_conversation_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conhecimento_base_workspace ON conhecimento_base(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON conversations(workspace_id);

-- CV CRM sync
CREATE INDEX IF NOT EXISTS idx_cvcrm_snapshots_workspace ON cvcrm_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cvcrm_sync_cursors_workspace ON cvcrm_sync_cursors(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cvcrm_sync_logs_workspace ON cvcrm_sync_logs(workspace_id);

-- Leads & Follow-ups
CREATE INDEX IF NOT EXISTS idx_followups_workspace ON followups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_workspace ON funnel_stages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_funnels_workspace ON funnels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_anotacoes_workspace ON lead_anotacoes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_lead_insights_workspace ON lead_insights(workspace_id);

-- Notifications & Simulations
CREATE INDEX IF NOT EXISTS idx_notificacoes_workspace ON notificacoes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_simulacoes_workspace ON simulacoes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_visitas_agendadas_workspace ON visitas_agendadas(workspace_id);

-- Salva Leads
CREATE INDEX IF NOT EXISTS idx_salva_leads_proactive_workspace ON salva_leads_proactive_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_salva_leads_runs_workspace ON salva_leads_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_salva_leads_visitas_workspace ON salva_leads_visitas(workspace_id);

-- WhatsApp
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_workspace ON whatsapp_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_workspace ON whatsapp_instances(workspace_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sync_runs_workspace ON whatsapp_sync_runs(workspace_id);

-- Additional composite indexes for common query patterns
-- Notificações: busca por corretor + lida/não-lida
CREATE INDEX IF NOT EXISTS idx_notificacoes_corretor_lida ON notificacoes(corretor_id, lida) WHERE lida = false;

-- Followups: busca por status pendente
CREATE INDEX IF NOT EXISTS idx_followups_workspace_status ON followups(workspace_id, status);

-- Salva Leads Runs: busca por corretor + data
CREATE INDEX IF NOT EXISTS idx_salva_leads_runs_workspace_created ON salva_leads_runs(workspace_id, created_at DESC);

COMMIT;

-- Verification
SELECT count(*) as total_workspace_indexes
FROM pg_indexes
WHERE schemaname='public'
AND indexdef LIKE '%workspace_id%';
