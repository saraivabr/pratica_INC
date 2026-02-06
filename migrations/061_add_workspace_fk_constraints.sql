-- Migration 061: Add missing FK constraints for workspace_id → workspaces(id)
-- Date: 2026-02-06
--
-- 47 tables have workspace_id but no FK constraint to workspaces.
-- Zero orphan workspace_ids found - safe to add constraints.

BEGIN;

-- Academy tables (from migration 060)
ALTER TABLE academy_categories ADD CONSTRAINT fk_academy_categories_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE academy_certificates ADD CONSTRAINT fk_academy_certificates_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE academy_lessons ADD CONSTRAINT fk_academy_lessons_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE academy_modules ADD CONSTRAINT fk_academy_modules_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE academy_progress ADD CONSTRAINT fk_academy_progress_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Agendamentos & Agent
ALTER TABLE agendamentos ADD CONSTRAINT fk_agendamentos_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE agent_configs ADD CONSTRAINT fk_agent_configs_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE agent_conversation_logs ADD CONSTRAINT fk_agent_conversation_logs_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- General tables
ALTER TABLE activities ADD CONSTRAINT fk_activities_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE comissao_beneficiarios_padrao ADD CONSTRAINT fk_comissao_benef_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE comissao_vendas ADD CONSTRAINT fk_comissao_vendas_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE conhecimento_base ADD CONSTRAINT fk_conhecimento_base_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE conversations ADD CONSTRAINT fk_conversations_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE disparos ADD CONSTRAINT fk_disparos_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- CV CRM tables
ALTER TABLE cvcrm_assistencias ADD CONSTRAINT fk_cvcrm_assistencias_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE cvcrm_atendimentos ADD CONSTRAINT fk_cvcrm_atendimentos_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE cvcrm_atendimentos_arquivos ADD CONSTRAINT fk_cvcrm_atendimentos_arq_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE cvcrm_leads ADD CONSTRAINT fk_cvcrm_leads_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE cvcrm_leads_interacoes ADD CONSTRAINT fk_cvcrm_leads_interacoes_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE cvcrm_leads_tarefas ADD CONSTRAINT fk_cvcrm_leads_tarefas_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE cvcrm_snapshots ADD CONSTRAINT fk_cvcrm_snapshots_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE cvcrm_sync_cursors ADD CONSTRAINT fk_cvcrm_sync_cursors_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE cvcrm_sync_logs ADD CONSTRAINT fk_cvcrm_sync_logs_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Events
ALTER TABLE eventos ADD CONSTRAINT fk_eventos_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE evento_convidados ADD CONSTRAINT fk_evento_convidados_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Leads & Followups
ALTER TABLE followups ADD CONSTRAINT fk_followups_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE funnel_stages ADD CONSTRAINT fk_funnel_stages_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE funnels ADD CONSTRAINT fk_funnels_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE lead_insights ADD CONSTRAINT fk_lead_insights_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE leads ADD CONSTRAINT fk_leads_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE notificacoes ADD CONSTRAINT fk_notificacoes_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE pipeline_leads ADD CONSTRAINT fk_pipeline_leads_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE propostas ADD CONSTRAINT fk_propostas_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Salva Leads
ALTER TABLE salva_leads_config ADD CONSTRAINT fk_salva_leads_config_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE salva_leads_conversations ADD CONSTRAINT fk_salva_leads_conversations_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE salva_leads_proactive_jobs ADD CONSTRAINT fk_salva_leads_proactive_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE salva_leads_runs ADD CONSTRAINT fk_salva_leads_runs_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE salva_leads_visitas ADD CONSTRAINT fk_salva_leads_visitas_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Simulacoes & Visitas
ALTER TABLE simulacoes ADD CONSTRAINT fk_simulacoes_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE visitas_agendadas ADD CONSTRAINT fk_visitas_agendadas_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- WhatsApp tables
ALTER TABLE whatsapp_campaigns ADD CONSTRAINT fk_whatsapp_campaigns_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE whatsapp_contacts ADD CONSTRAINT fk_whatsapp_contacts_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE whatsapp_instances ADD CONSTRAINT fk_whatsapp_instances_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE whatsapp_sync_runs ADD CONSTRAINT fk_whatsapp_sync_runs_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE whatsapp_synced_chats ADD CONSTRAINT fk_whatsapp_synced_chats_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE whatsapp_synced_contacts ADD CONSTRAINT fk_whatsapp_synced_contacts_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

COMMIT;

-- Verification: count new FK constraints
SELECT count(*) as new_workspace_fks
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND kcu.column_name = 'workspace_id'
AND ccu.table_name = 'workspaces';
