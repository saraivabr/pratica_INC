-- Migration 073: Add workspace_id to all CV CRM tables missing it
-- 63 cvcrm_* tables need workspace_id for multi-tenant isolation
-- 7 tables have data (all synced for workspace_id=1)
-- 56 tables are empty
--
-- NOTE: CREATE INDEX (not CONCURRENTLY) used so we can run inside a transaction

BEGIN;

-- ============================================================================
-- TABLES WITH DATA (7 tables) — add column, populate, set NOT NULL, FK, index
-- ============================================================================

-- cvcrm_unidades (2,084 rows)
ALTER TABLE cvcrm_unidades ADD COLUMN workspace_id INTEGER;
UPDATE cvcrm_unidades SET workspace_id = 1;
ALTER TABLE cvcrm_unidades ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_unidades ADD CONSTRAINT fk_cvcrm_unidades_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_unidades_workspace ON cvcrm_unidades(workspace_id);

-- cvcrm_corretores (1,295 rows)
ALTER TABLE cvcrm_corretores ADD COLUMN workspace_id INTEGER;
UPDATE cvcrm_corretores SET workspace_id = 1;
ALTER TABLE cvcrm_corretores ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_corretores ADD CONSTRAINT fk_cvcrm_corretores_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_corretores_workspace ON cvcrm_corretores(workspace_id);

-- cvcrm_plantas (154 rows)
ALTER TABLE cvcrm_plantas ADD COLUMN workspace_id INTEGER;
UPDATE cvcrm_plantas SET workspace_id = 1;
ALTER TABLE cvcrm_plantas ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_plantas ADD CONSTRAINT fk_cvcrm_plantas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_plantas_workspace ON cvcrm_plantas(workspace_id);

-- cvcrm_materiais_campanha (45 rows)
ALTER TABLE cvcrm_materiais_campanha ADD COLUMN workspace_id INTEGER;
UPDATE cvcrm_materiais_campanha SET workspace_id = 1;
ALTER TABLE cvcrm_materiais_campanha ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_materiais_campanha ADD CONSTRAINT fk_cvcrm_materiais_campanha_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_materiais_campanha_workspace ON cvcrm_materiais_campanha(workspace_id);

-- cvcrm_series (27 rows)
ALTER TABLE cvcrm_series ADD COLUMN workspace_id INTEGER;
UPDATE cvcrm_series SET workspace_id = 1;
ALTER TABLE cvcrm_series ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_series ADD CONSTRAINT fk_cvcrm_series_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_series_workspace ON cvcrm_series(workspace_id);

-- cvcrm_empreendimentos (20 rows)
ALTER TABLE cvcrm_empreendimentos ADD COLUMN workspace_id INTEGER;
UPDATE cvcrm_empreendimentos SET workspace_id = 1;
ALTER TABLE cvcrm_empreendimentos ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_empreendimentos ADD CONSTRAINT fk_cvcrm_empreendimentos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_empreendimentos_workspace ON cvcrm_empreendimentos(workspace_id);

-- cvcrm_tabelas_preco (11 rows)
ALTER TABLE cvcrm_tabelas_preco ADD COLUMN workspace_id INTEGER;
UPDATE cvcrm_tabelas_preco SET workspace_id = 1;
ALTER TABLE cvcrm_tabelas_preco ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE cvcrm_tabelas_preco ADD CONSTRAINT fk_cvcrm_tabelas_preco_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_tabelas_preco_workspace ON cvcrm_tabelas_preco(workspace_id);

-- ============================================================================
-- EMPTY TABLES (56 tables) — add column NOT NULL with DEFAULT, FK, index
-- Using DEFAULT 0 trick: add with default, then drop default, add FK
-- Actually since they're empty, just add NOT NULL directly
-- ============================================================================

-- cvcrm_agendamentos
ALTER TABLE cvcrm_agendamentos ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_agendamentos ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_agendamentos ADD CONSTRAINT fk_cvcrm_agendamentos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_agendamentos_workspace ON cvcrm_agendamentos(workspace_id);

-- cvcrm_assistencia_itens
ALTER TABLE cvcrm_assistencia_itens ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_assistencia_itens ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_assistencia_itens ADD CONSTRAINT fk_cvcrm_assistencia_itens_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_assistencia_itens_workspace ON cvcrm_assistencia_itens(workspace_id);

-- cvcrm_assistencia_tempo
ALTER TABLE cvcrm_assistencia_tempo ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_assistencia_tempo ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_assistencia_tempo ADD CONSTRAINT fk_cvcrm_assistencia_tempo_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_assistencia_tempo_workspace ON cvcrm_assistencia_tempo(workspace_id);

-- cvcrm_assistencia_visitas
ALTER TABLE cvcrm_assistencia_visitas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_assistencia_visitas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_assistencia_visitas ADD CONSTRAINT fk_cvcrm_assistencia_visitas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_assistencia_visitas_workspace ON cvcrm_assistencia_visitas(workspace_id);

-- cvcrm_assistencia_workflow
ALTER TABLE cvcrm_assistencia_workflow ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_assistencia_workflow ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_assistencia_workflow ADD CONSTRAINT fk_cvcrm_assistencia_workflow_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_assistencia_workflow_workspace ON cvcrm_assistencia_workflow(workspace_id);

-- cvcrm_atendimento_interacoes
ALTER TABLE cvcrm_atendimento_interacoes ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_atendimento_interacoes ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_atendimento_interacoes ADD CONSTRAINT fk_cvcrm_atendimento_interacoes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_atendimento_interacoes_workspace ON cvcrm_atendimento_interacoes(workspace_id);

-- cvcrm_atendimento_respostas
ALTER TABLE cvcrm_atendimento_respostas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_atendimento_respostas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_atendimento_respostas ADD CONSTRAINT fk_cvcrm_atendimento_respostas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_atendimento_respostas_workspace ON cvcrm_atendimento_respostas(workspace_id);

-- cvcrm_atendimento_tarefas
ALTER TABLE cvcrm_atendimento_tarefas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_atendimento_tarefas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_atendimento_tarefas ADD CONSTRAINT fk_cvcrm_atendimento_tarefas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_atendimento_tarefas_workspace ON cvcrm_atendimento_tarefas(workspace_id);

-- cvcrm_atendimento_time_integrantes
ALTER TABLE cvcrm_atendimento_time_integrantes ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_atendimento_time_integrantes ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_atendimento_time_integrantes ADD CONSTRAINT fk_cvcrm_atendimento_time_integrantes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_atendimento_time_integrantes_workspace ON cvcrm_atendimento_time_integrantes(workspace_id);

-- cvcrm_atendimento_times
ALTER TABLE cvcrm_atendimento_times ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_atendimento_times ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_atendimento_times ADD CONSTRAINT fk_cvcrm_atendimento_times_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_atendimento_times_workspace ON cvcrm_atendimento_times(workspace_id);

-- cvcrm_atendimento_workflow
ALTER TABLE cvcrm_atendimento_workflow ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_atendimento_workflow ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_atendimento_workflow ADD CONSTRAINT fk_cvcrm_atendimento_workflow_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_atendimento_workflow_workspace ON cvcrm_atendimento_workflow(workspace_id);

-- cvcrm_campanhas
ALTER TABLE cvcrm_campanhas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_campanhas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_campanhas ADD CONSTRAINT fk_cvcrm_campanhas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_campanhas_workspace ON cvcrm_campanhas(workspace_id);

-- cvcrm_campos_personalizados
ALTER TABLE cvcrm_campos_personalizados ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_campos_personalizados ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_campos_personalizados ADD CONSTRAINT fk_cvcrm_campos_personalizados_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_campos_personalizados_workspace ON cvcrm_campos_personalizados(workspace_id);

-- cvcrm_comissao_pagamentos
ALTER TABLE cvcrm_comissao_pagamentos ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_comissao_pagamentos ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_comissao_pagamentos ADD CONSTRAINT fk_cvcrm_comissao_pagamentos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_comissao_pagamentos_workspace ON cvcrm_comissao_pagamentos(workspace_id);

-- cvcrm_comissoes
ALTER TABLE cvcrm_comissoes ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_comissoes ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_comissoes ADD CONSTRAINT fk_cvcrm_comissoes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_comissoes_workspace ON cvcrm_comissoes(workspace_id);

-- cvcrm_distratos
ALTER TABLE cvcrm_distratos ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_distratos ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_distratos ADD CONSTRAINT fk_cvcrm_distratos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_distratos_workspace ON cvcrm_distratos(workspace_id);

-- cvcrm_imobiliarias
ALTER TABLE cvcrm_imobiliarias ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_imobiliarias ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_imobiliarias ADD CONSTRAINT fk_cvcrm_imobiliarias_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_imobiliarias_workspace ON cvcrm_imobiliarias(workspace_id);

-- cvcrm_lead_conversoes
ALTER TABLE cvcrm_lead_conversoes ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_lead_conversoes ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_lead_conversoes ADD CONSTRAINT fk_cvcrm_lead_conversoes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_lead_conversoes_workspace ON cvcrm_lead_conversoes(workspace_id);

-- cvcrm_lead_historico_corretores
ALTER TABLE cvcrm_lead_historico_corretores ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_lead_historico_corretores ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_lead_historico_corretores ADD CONSTRAINT fk_cvcrm_lead_historico_corretores_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_lead_historico_corretores_workspace ON cvcrm_lead_historico_corretores(workspace_id);

-- cvcrm_lead_historico_situacoes
ALTER TABLE cvcrm_lead_historico_situacoes ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_lead_historico_situacoes ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_lead_historico_situacoes ADD CONSTRAINT fk_cvcrm_lead_historico_situacoes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_lead_historico_situacoes_workspace ON cvcrm_lead_historico_situacoes(workspace_id);

-- cvcrm_lead_infos
ALTER TABLE cvcrm_lead_infos ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_lead_infos ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_lead_infos ADD CONSTRAINT fk_cvcrm_lead_infos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_lead_infos_workspace ON cvcrm_lead_infos(workspace_id);

-- cvcrm_lead_momentos
ALTER TABLE cvcrm_lead_momentos ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_lead_momentos ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_lead_momentos ADD CONSTRAINT fk_cvcrm_lead_momentos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_lead_momentos_workspace ON cvcrm_lead_momentos(workspace_id);

-- cvcrm_lead_origens
ALTER TABLE cvcrm_lead_origens ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_lead_origens ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_lead_origens ADD CONSTRAINT fk_cvcrm_lead_origens_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_lead_origens_workspace ON cvcrm_lead_origens(workspace_id);

-- cvcrm_lead_tarefas
ALTER TABLE cvcrm_lead_tarefas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_lead_tarefas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_lead_tarefas ADD CONSTRAINT fk_cvcrm_lead_tarefas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_lead_tarefas_workspace ON cvcrm_lead_tarefas(workspace_id);

-- cvcrm_lead_visitas
ALTER TABLE cvcrm_lead_visitas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_lead_visitas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_lead_visitas ADD CONSTRAINT fk_cvcrm_lead_visitas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_lead_visitas_workspace ON cvcrm_lead_visitas(workspace_id);

-- cvcrm_lead_workflow
ALTER TABLE cvcrm_lead_workflow ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_lead_workflow ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_lead_workflow ADD CONSTRAINT fk_cvcrm_lead_workflow_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_lead_workflow_workspace ON cvcrm_lead_workflow(workspace_id);

-- cvcrm_pesquisas
ALTER TABLE cvcrm_pesquisas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_pesquisas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_pesquisas ADD CONSTRAINT fk_cvcrm_pesquisas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_pesquisas_workspace ON cvcrm_pesquisas(workspace_id);

-- cvcrm_pessoa_bancarios
ALTER TABLE cvcrm_pessoa_bancarios ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_pessoa_bancarios ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_pessoa_bancarios ADD CONSTRAINT fk_cvcrm_pessoa_bancarios_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_pessoa_bancarios_workspace ON cvcrm_pessoa_bancarios(workspace_id);

-- cvcrm_pessoa_bens_empresariais
ALTER TABLE cvcrm_pessoa_bens_empresariais ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_pessoa_bens_empresariais ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_pessoa_bens_empresariais ADD CONSTRAINT fk_cvcrm_pessoa_bens_empresariais_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_pessoa_bens_empresariais_workspace ON cvcrm_pessoa_bens_empresariais(workspace_id);

-- cvcrm_pessoa_contatos
ALTER TABLE cvcrm_pessoa_contatos ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_pessoa_contatos ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_pessoa_contatos ADD CONSTRAINT fk_cvcrm_pessoa_contatos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_pessoa_contatos_workspace ON cvcrm_pessoa_contatos(workspace_id);

-- cvcrm_pessoa_dados_profissionais
ALTER TABLE cvcrm_pessoa_dados_profissionais ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_pessoa_dados_profissionais ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_pessoa_dados_profissionais ADD CONSTRAINT fk_cvcrm_pessoa_dados_profissionais_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_pessoa_dados_profissionais_workspace ON cvcrm_pessoa_dados_profissionais(workspace_id);

-- cvcrm_pessoa_financeiros
ALTER TABLE cvcrm_pessoa_financeiros ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_pessoa_financeiros ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_pessoa_financeiros ADD CONSTRAINT fk_cvcrm_pessoa_financeiros_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_pessoa_financeiros_workspace ON cvcrm_pessoa_financeiros(workspace_id);

-- cvcrm_pessoa_patrimonio
ALTER TABLE cvcrm_pessoa_patrimonio ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_pessoa_patrimonio ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_pessoa_patrimonio ADD CONSTRAINT fk_cvcrm_pessoa_patrimonio_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_pessoa_patrimonio_workspace ON cvcrm_pessoa_patrimonio(workspace_id);

-- cvcrm_pessoas
ALTER TABLE cvcrm_pessoas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_pessoas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_pessoas ADD CONSTRAINT fk_cvcrm_pessoas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_pessoas_workspace ON cvcrm_pessoas(workspace_id);

-- cvcrm_precadastro_workflow
ALTER TABLE cvcrm_precadastro_workflow ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_precadastro_workflow ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_precadastro_workflow ADD CONSTRAINT fk_cvcrm_precadastro_workflow_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_precadastro_workflow_workspace ON cvcrm_precadastro_workflow(workspace_id);

-- cvcrm_precadastros
ALTER TABLE cvcrm_precadastros ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_precadastros ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_precadastros ADD CONSTRAINT fk_cvcrm_precadastros_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_precadastros_workspace ON cvcrm_precadastros(workspace_id);

-- cvcrm_processo_demandas
ALTER TABLE cvcrm_processo_demandas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_processo_demandas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_processo_demandas ADD CONSTRAINT fk_cvcrm_processo_demandas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_processo_demandas_workspace ON cvcrm_processo_demandas(workspace_id);

-- cvcrm_processos
ALTER TABLE cvcrm_processos ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_processos ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_processos ADD CONSTRAINT fk_cvcrm_processos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_processos_workspace ON cvcrm_processos(workspace_id);

-- cvcrm_propostas
ALTER TABLE cvcrm_propostas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_propostas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_propostas ADD CONSTRAINT fk_cvcrm_propostas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_propostas_workspace ON cvcrm_propostas(workspace_id);

-- cvcrm_repasse_workflow
ALTER TABLE cvcrm_repasse_workflow ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_repasse_workflow ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_repasse_workflow ADD CONSTRAINT fk_cvcrm_repasse_workflow_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_repasse_workflow_workspace ON cvcrm_repasse_workflow(workspace_id);

-- cvcrm_repasses
ALTER TABLE cvcrm_repasses ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_repasses ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_repasses ADD CONSTRAINT fk_cvcrm_repasses_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_repasses_workspace ON cvcrm_repasses(workspace_id);

-- cvcrm_reserva_associados
ALTER TABLE cvcrm_reserva_associados ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_associados ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_associados ADD CONSTRAINT fk_cvcrm_reserva_associados_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_associados_workspace ON cvcrm_reserva_associados(workspace_id);

-- cvcrm_reserva_campos_adicionais
ALTER TABLE cvcrm_reserva_campos_adicionais ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_campos_adicionais ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_campos_adicionais ADD CONSTRAINT fk_cvcrm_reserva_campos_adicionais_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_campos_adicionais_workspace ON cvcrm_reserva_campos_adicionais(workspace_id);

-- cvcrm_reserva_comissoes
ALTER TABLE cvcrm_reserva_comissoes ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_comissoes ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_comissoes ADD CONSTRAINT fk_cvcrm_reserva_comissoes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_comissoes_workspace ON cvcrm_reserva_comissoes(workspace_id);

-- cvcrm_reserva_condicoes
ALTER TABLE cvcrm_reserva_condicoes ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_condicoes ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_condicoes ADD CONSTRAINT fk_cvcrm_reserva_condicoes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_condicoes_workspace ON cvcrm_reserva_condicoes(workspace_id);

-- cvcrm_reserva_contratos
ALTER TABLE cvcrm_reserva_contratos ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_contratos ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_contratos ADD CONSTRAINT fk_cvcrm_reserva_contratos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_contratos_workspace ON cvcrm_reserva_contratos(workspace_id);

-- cvcrm_reserva_coordenadores
ALTER TABLE cvcrm_reserva_coordenadores ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_coordenadores ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_coordenadores ADD CONSTRAINT fk_cvcrm_reserva_coordenadores_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_coordenadores_workspace ON cvcrm_reserva_coordenadores(workspace_id);

-- cvcrm_reserva_flags
ALTER TABLE cvcrm_reserva_flags ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_flags ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_flags ADD CONSTRAINT fk_cvcrm_reserva_flags_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_flags_workspace ON cvcrm_reserva_flags(workspace_id);

-- cvcrm_reserva_historico
ALTER TABLE cvcrm_reserva_historico ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_historico ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_historico ADD CONSTRAINT fk_cvcrm_reserva_historico_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_historico_workspace ON cvcrm_reserva_historico(workspace_id);

-- cvcrm_reserva_sienge
ALTER TABLE cvcrm_reserva_sienge ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_sienge ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_sienge ADD CONSTRAINT fk_cvcrm_reserva_sienge_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_sienge_workspace ON cvcrm_reserva_sienge(workspace_id);

-- cvcrm_reserva_situacoes
ALTER TABLE cvcrm_reserva_situacoes ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_situacoes ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_situacoes ADD CONSTRAINT fk_cvcrm_reserva_situacoes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_situacoes_workspace ON cvcrm_reserva_situacoes(workspace_id);

-- cvcrm_reserva_workflow
ALTER TABLE cvcrm_reserva_workflow ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_reserva_workflow ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_reserva_workflow ADD CONSTRAINT fk_cvcrm_reserva_workflow_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_reserva_workflow_workspace ON cvcrm_reserva_workflow(workspace_id);

-- cvcrm_unidade_precos
ALTER TABLE cvcrm_unidade_precos ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_unidade_precos ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_unidade_precos ADD CONSTRAINT fk_cvcrm_unidade_precos_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_unidade_precos_workspace ON cvcrm_unidade_precos(workspace_id);

-- cvcrm_unidade_situacoes
ALTER TABLE cvcrm_unidade_situacoes ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_unidade_situacoes ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_unidade_situacoes ADD CONSTRAINT fk_cvcrm_unidade_situacoes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_unidade_situacoes_workspace ON cvcrm_unidade_situacoes(workspace_id);

-- cvcrm_usuarios
ALTER TABLE cvcrm_usuarios ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_usuarios ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_usuarios ADD CONSTRAINT fk_cvcrm_usuarios_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_usuarios_workspace ON cvcrm_usuarios(workspace_id);

-- cvcrm_vendas
ALTER TABLE cvcrm_vendas ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cvcrm_vendas ALTER COLUMN workspace_id DROP DEFAULT;
ALTER TABLE cvcrm_vendas ADD CONSTRAINT fk_cvcrm_vendas_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
CREATE INDEX idx_cvcrm_vendas_workspace ON cvcrm_vendas(workspace_id);

COMMIT;
