-- Migration 068: Transfer table ownership from postgres to pratica
-- All tables should be owned by pratica for consistent RLS behavior
-- When FORCE ROW LEVEL SECURITY is set, only the table owner bypasses RLS
-- Having all tables owned by pratica ensures consistent behavior

BEGIN;

ALTER TABLE conhecimento_base OWNER TO pratica;
ALTER TABLE conversation_locks OWNER TO pratica;
ALTER TABLE conversations OWNER TO pratica;
ALTER TABLE cvcrm_atendimentos_arquivos OWNER TO pratica;
ALTER TABLE cvcrm_leads_interacoes OWNER TO pratica;
ALTER TABLE cvcrm_propostas OWNER TO pratica;
ALTER TABLE cvcrm_snapshots OWNER TO pratica;
ALTER TABLE disparo_leads OWNER TO pratica;
ALTER TABLE disparos OWNER TO pratica;
ALTER TABLE followups OWNER TO pratica;
ALTER TABLE inbound_messages OWNER TO pratica;
ALTER TABLE lead_anotacoes OWNER TO pratica;
ALTER TABLE lead_insights OWNER TO pratica;
ALTER TABLE leads_interactions OWNER TO pratica;
ALTER TABLE notificacoes OWNER TO pratica;
ALTER TABLE onboarding_leads OWNER TO pratica;
ALTER TABLE pipeline_leads OWNER TO pratica;
ALTER TABLE proposta_documentos OWNER TO pratica;
ALTER TABLE proposta_parcelas OWNER TO pratica;
ALTER TABLE propostas OWNER TO pratica;
ALTER TABLE recepcao_atribuicoes OWNER TO pratica;
ALTER TABLE recepcao_distribuicao_log OWNER TO pratica;
ALTER TABLE recepcao_feriados OWNER TO pratica;
ALTER TABLE recepcao_locais OWNER TO pratica;
ALTER TABLE recepcao_plantoes_criados_auto OWNER TO pratica;
ALTER TABLE recepcao_plantoes_recorrentes OWNER TO pratica;
ALTER TABLE recepcionista_leads OWNER TO pratica;
ALTER TABLE roleta_gamificacao OWNER TO pratica;
ALTER TABLE roleta_ofertas OWNER TO pratica;
ALTER TABLE roleta_qualificacao OWNER TO pratica;
ALTER TABLE salva_leads_proactive_jobs OWNER TO pratica;
ALTER TABLE salva_leads_visitas OWNER TO pratica;
ALTER TABLE schema_migrations OWNER TO pratica;
ALTER TABLE simulacoes OWNER TO pratica;
ALTER TABLE tracking_events OWNER TO pratica;
ALTER TABLE user_memory OWNER TO pratica;
ALTER TABLE visitas_agendadas OWNER TO pratica;

-- Record migration
INSERT INTO schema_migrations (filename) VALUES ('068_transfer_table_ownership.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
