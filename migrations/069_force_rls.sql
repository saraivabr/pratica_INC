-- Migration 069: Force Row Level Security on all RLS-enabled tables
-- Previously RLS was enabled but NOT forced, meaning the table owner (pratica)
-- bypassed RLS policies. With FORCE, even the table owner must satisfy RLS policies.
-- This requires all queries to set app.current_workspace_id via withTenant().

BEGIN;

-- Force RLS on all 13 tables that have RLS policies
ALTER TABLE cvcrm_leads FORCE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_leads_tarefas FORCE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_atendimentos FORCE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_assistencias FORCE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE academy_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE agendamentos FORCE ROW LEVEL SECURITY;
ALTER TABLE comissao_vendas FORCE ROW LEVEL SECURITY;
ALTER TABLE recepcao_plantoes FORCE ROW LEVEL SECURITY;
ALTER TABLE recepcao_presencas FORCE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_lead_interacoes FORCE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_reservas FORCE ROW LEVEL SECURITY;
ALTER TABLE eventos FORCE ROW LEVEL SECURITY;

-- Record migration
INSERT INTO schema_migrations (filename) VALUES ('069_force_rls.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
