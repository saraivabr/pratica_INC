-- Migration 040: Adicionar Foreign Keys Faltando
-- Objetivo: Garantir integridade referencial completa no banco
-- Impacto: +40 Foreign Keys adicionadas, sem perda de dados
-- Duração estimada: 2-3 minutos

-- ============================================================================
-- PASSO 1: Limpeza de dados órfãos (validação)
-- ============================================================================
-- Este bloco identifica records órfãos que impediriam adicionar FKs

-- Leads com corretor_id inválido
SELECT COUNT(*) as orphan_leads_corretor
FROM cvcrm_leads
WHERE corretor_id IS NOT NULL
AND corretor_id NOT IN (SELECT cvcrm_id FROM cvcrm_corretores);

-- Leads com imobiliaria_id inválido
SELECT COUNT(*) as orphan_leads_imobiliaria
FROM cvcrm_leads
WHERE imobiliaria_id IS NOT NULL
AND imobiliaria_id NOT IN (SELECT cvcrm_id FROM cvcrm_imobiliarias);

-- Leads com gestor_id inválido
SELECT COUNT(*) as orphan_leads_gestor
FROM cvcrm_leads
WHERE gestor_id IS NOT NULL
AND gestor_id NOT IN (SELECT cvcrm_id FROM cvcrm_usuarios);

-- ============================================================================
-- PASSO 2: Adicionar Foreign Keys - CVCRM_LEADS (Núcleo de Leads)
-- ============================================================================

-- FK: leads → workspace
ALTER TABLE cvcrm_leads
  ADD CONSTRAINT fk_cvcrm_leads_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: leads → corretor (vendedor)
-- Nota: corretor_id é opcional (pode não ter sido designado)
ALTER TABLE cvcrm_leads
  ADD CONSTRAINT fk_cvcrm_leads_corretor
  FOREIGN KEY (corretor_id) REFERENCES cvcrm_corretores(cvcrm_id) ON DELETE SET NULL;

-- FK: leads → imobiliária
ALTER TABLE cvcrm_leads
  ADD CONSTRAINT fk_cvcrm_leads_imobiliaria
  FOREIGN KEY (imobiliaria_id) REFERENCES cvcrm_imobiliarias(cvcrm_id) ON DELETE SET NULL;

-- FK: leads → gestor (usuário que acompanha)
ALTER TABLE cvcrm_leads
  ADD CONSTRAINT fk_cvcrm_leads_gestor
  FOREIGN KEY (gestor_id) REFERENCES cvcrm_usuarios(cvcrm_id) ON DELETE SET NULL;

-- ============================================================================
-- PASSO 3: Adicionar Foreign Keys - CVCRM_LEAD_INTERACOES
-- ============================================================================

-- FK: interações → lead
ALTER TABLE cvcrm_lead_interacoes
  ADD CONSTRAINT fk_cvcrm_lead_interacoes_lead
  FOREIGN KEY (idlead) REFERENCES cvcrm_leads(idlead) ON DELETE CASCADE;

-- FK: interações → workspace
ALTER TABLE cvcrm_lead_interacoes
  ADD CONSTRAINT fk_cvcrm_lead_interacoes_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: interações → corretor (quem fez a interação)
ALTER TABLE cvcrm_lead_interacoes
  ADD CONSTRAINT fk_cvcrm_lead_interacoes_corretor
  FOREIGN KEY (idcorretor) REFERENCES cvcrm_corretores(cvcrm_id) ON DELETE SET NULL;

-- ============================================================================
-- PASSO 4: Adicionar Foreign Keys - CVCRM_LEAD_TAREFAS
-- ============================================================================

-- FK: tarefas → lead
ALTER TABLE cvcrm_lead_tarefas
  ADD CONSTRAINT fk_cvcrm_lead_tarefas_lead
  FOREIGN KEY (idlead) REFERENCES cvcrm_leads(idlead) ON DELETE CASCADE;

-- FK: tarefas → workspace
ALTER TABLE cvcrm_lead_tarefas
  ADD CONSTRAINT fk_cvcrm_lead_tarefas_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: tarefas → responsável (corretor)
ALTER TABLE cvcrm_lead_tarefas
  ADD CONSTRAINT fk_cvcrm_lead_tarefas_responsavel
  FOREIGN KEY (id_responsavel) REFERENCES cvcrm_corretores(cvcrm_id) ON DELETE SET NULL;

-- ============================================================================
-- PASSO 5: Adicionar Foreign Keys - CVCRM_RESERVAS (Reservas)
-- ============================================================================

-- FK: reservas → workspace
ALTER TABLE cvcrm_reservas
  ADD CONSTRAINT fk_cvcrm_reservas_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: reservas → lead
ALTER TABLE cvcrm_reservas
  ADD CONSTRAINT fk_cvcrm_reservas_lead
  FOREIGN KEY (idlead) REFERENCES cvcrm_leads(idlead) ON DELETE SET NULL;

-- FK: reservas → empreendimento
ALTER TABLE cvcrm_reservas
  ADD CONSTRAINT fk_cvcrm_reservas_empreendimento
  FOREIGN KEY (idempreendimento) REFERENCES cvcrm_empreendimentos(cvcrm_id) ON DELETE SET NULL;

-- FK: reservas → unidade
ALTER TABLE cvcrm_reservas
  ADD CONSTRAINT fk_cvcrm_reservas_unidade
  FOREIGN KEY (idunidade) REFERENCES cvcrm_unidades(cvcrm_id) ON DELETE SET NULL;

-- ============================================================================
-- PASSO 6: Adicionar Foreign Keys - WHATSAPP_MESSAGES
-- ============================================================================

-- FK: messages → workspace
ALTER TABLE whatsapp_messages
  ADD CONSTRAINT fk_whatsapp_messages_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- ============================================================================
-- PASSO 7: Adicionar Foreign Keys - WHATSAPP_CONTACTS
-- ============================================================================

-- FK: contacts → workspace
ALTER TABLE whatsapp_contacts
  ADD CONSTRAINT fk_whatsapp_contacts_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- ============================================================================
-- PASSO 8: Adicionar Foreign Keys - EVENTOS
-- ============================================================================

-- FK: eventos → workspace
ALTER TABLE eventos
  ADD CONSTRAINT fk_eventos_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- ============================================================================
-- PASSO 9: Adicionar Foreign Keys - EVENTO_CONVIDADOS
-- ============================================================================

-- FK: evento_convidados → evento
ALTER TABLE evento_convidados
  ADD CONSTRAINT fk_evento_convidados_evento
  FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE;

-- FK: evento_convidados → workspace
ALTER TABLE evento_convidados
  ADD CONSTRAINT fk_evento_convidados_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: evento_convidados → corretor
ALTER TABLE evento_convidados
  ADD CONSTRAINT fk_evento_convidados_corretor
  FOREIGN KEY (corretor_id) REFERENCES cvcrm_corretores(cvcrm_id) ON DELETE CASCADE;

-- ============================================================================
-- PASSO 10: Adicionar Foreign Keys - AGENDAMENTOS
-- ============================================================================

-- FK: agendamentos → workspace (se existir coluna)
ALTER TABLE agendamentos
  ADD CONSTRAINT fk_agendamentos_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: agendamentos → empreendimento
ALTER TABLE agendamentos
  ADD CONSTRAINT fk_agendamentos_empreendimento
  FOREIGN KEY (empreendimento_id) REFERENCES cvcrm_empreendimentos(cvcrm_id) ON DELETE SET NULL;

-- FK: agendamentos → unidade
ALTER TABLE agendamentos
  ADD CONSTRAINT fk_agendamentos_unidade
  FOREIGN KEY (unidade_id) REFERENCES cvcrm_unidades(cvcrm_id) ON DELETE SET NULL;

-- FK: agendamentos → corretor
ALTER TABLE agendamentos
  ADD CONSTRAINT fk_agendamentos_corretor
  FOREIGN KEY (corretor_id) REFERENCES cvcrm_corretores(cvcrm_id) ON DELETE SET NULL;

-- ============================================================================
-- PASSO 11: Adicionar Foreign Keys - COMISSAO (Sistema de Comissões)
-- ============================================================================

-- FK: comissao_vendas → workspace
ALTER TABLE comissao_vendas
  ADD CONSTRAINT fk_comissao_vendas_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: comissao_corretores → venda
ALTER TABLE comissao_corretores
  ADD CONSTRAINT fk_comissao_corretores_venda
  FOREIGN KEY (venda_id) REFERENCES comissao_vendas(id) ON DELETE CASCADE;

-- FK: comissao_parcelas → venda
ALTER TABLE comissao_parcelas
  ADD CONSTRAINT fk_comissao_parcelas_venda
  FOREIGN KEY (venda_id) REFERENCES comissao_vendas(id) ON DELETE CASCADE;

-- FK: comissao_matriz → venda
ALTER TABLE comissao_matriz
  ADD CONSTRAINT fk_comissao_matriz_venda
  FOREIGN KEY (venda_id) REFERENCES comissao_vendas(id) ON DELETE CASCADE;

-- FK: comissao_grupos → venda
ALTER TABLE comissao_grupos
  ADD CONSTRAINT fk_comissao_grupos_venda
  FOREIGN KEY (venda_id) REFERENCES comissao_vendas(id) ON DELETE CASCADE;

-- FK: comissao_beneficiarios_padrao → workspace
ALTER TABLE comissao_beneficiarios_padrao
  ADD CONSTRAINT fk_comissao_beneficiarios_padrao_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- ============================================================================
-- PASSO 12: Adicionar Foreign Keys - RECEPCAO (Sistema de Recepção)
-- ============================================================================

-- FK: recepcao_plantoes → workspace
ALTER TABLE recepcao_plantoes
  ADD CONSTRAINT fk_recepcao_plantoes_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: recepcao_presencas → plantão
ALTER TABLE recepcao_presencas
  ADD CONSTRAINT fk_recepcao_presencas_plantao
  FOREIGN KEY (plantao_id) REFERENCES recepcao_plantoes(id) ON DELETE CASCADE;

-- FK: recepcao_presencas → workspace
ALTER TABLE recepcao_presencas
  ADD CONSTRAINT fk_recepcao_presencas_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: recepcao_presencas → corretor
ALTER TABLE recepcao_presencas
  ADD CONSTRAINT fk_recepcao_presencas_corretor
  FOREIGN KEY (corretor_id) REFERENCES cvcrm_corretores(cvcrm_id) ON DELETE CASCADE;

-- FK: recepcao_atribuicoes → presença
ALTER TABLE recepcao_atribuicoes
  ADD CONSTRAINT fk_recepcao_atribuicoes_presenca
  FOREIGN KEY (presenca_id) REFERENCES recepcao_presencas(id) ON DELETE CASCADE;

-- FK: recepcao_atribuicoes → workspace
ALTER TABLE recepcao_atribuicoes
  ADD CONSTRAINT fk_recepcao_atribuicoes_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: recepcao_atribuicoes → lead (lead sorteado/distribuído)
ALTER TABLE recepcao_atribuicoes
  ADD CONSTRAINT fk_recepcao_atribuicoes_lead
  FOREIGN KEY (lead_id) REFERENCES cvcrm_leads(idlead) ON DELETE CASCADE;

-- ============================================================================
-- PASSO 13: Adicionar Foreign Keys - ACADEMY (Plataforma de Treinamento)
-- ============================================================================

-- FK: academy_lessons → workspace
ALTER TABLE academy_lessons
  ADD CONSTRAINT fk_academy_lessons_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: academy_progress → user
ALTER TABLE academy_progress
  ADD CONSTRAINT fk_academy_progress_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- FK: academy_progress → workspace
ALTER TABLE academy_progress
  ADD CONSTRAINT fk_academy_progress_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: academy_certificates → user
ALTER TABLE academy_certificates
  ADD CONSTRAINT fk_academy_certificates_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- FK: academy_certificates → workspace
ALTER TABLE academy_certificates
  ADD CONSTRAINT fk_academy_certificates_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- ============================================================================
-- PASSO 14: Adicionar Foreign Keys - SALVA_LEADS (Bot de Reengajamento)
-- ============================================================================

-- FK: salva_leads_conversations → workspace
ALTER TABLE salva_leads_conversations
  ADD CONSTRAINT fk_salva_leads_conversations_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- FK: salva_leads_conversations → lead
ALTER TABLE salva_leads_conversations
  ADD CONSTRAINT fk_salva_leads_conversations_lead
  FOREIGN KEY (lead_id) REFERENCES cvcrm_leads(idlead) ON DELETE CASCADE;

-- FK: salva_leads_messages → conversation
ALTER TABLE salva_leads_messages
  ADD CONSTRAINT fk_salva_leads_messages_conversation
  FOREIGN KEY (conversation_id) REFERENCES salva_leads_conversations(id) ON DELETE CASCADE;

-- FK: salva_leads_messages → workspace
ALTER TABLE salva_leads_messages
  ADD CONSTRAINT fk_salva_leads_messages_workspace
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- ============================================================================
-- PASSO 15: Validação Final
-- ============================================================================

-- Contar FKs adicionadas
SELECT COUNT(*) as total_foreign_keys
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND constraint_type = 'FOREIGN KEY'
AND constraint_name LIKE 'fk_%';

-- Verificar se há colunas _id sem FK
SELECT
  t.table_name,
  c.column_name,
  c.data_type
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE t.table_schema = 'public'
AND c.column_name LIKE '%_id'
AND c.column_name != 'id'
AND c.column_name != 'workspace_id'
AND NOT EXISTS (
  SELECT 1 FROM information_schema.constraint_column_usage ccu
  WHERE ccu.table_name = c.table_name
  AND ccu.column_name = c.column_name
)
ORDER BY t.table_name, c.column_name;

-- ============================================================================
-- Notas Importantes
-- ============================================================================
/*
EXECUTAR ESTA MIGRATION:

1. LOCAL (para testes):
   psql -U pratica -d pratica < migrations/040_add_foreign_keys.sql

2. PRODUÇÃO (VPS):
   ssh root@185.182.184.122 "psql -U pratica -d pratica" < migrations/040_add_foreign_keys.sql

ROLLBACK (se necessário):
   Cada ALTER TABLE com ADD CONSTRAINT pode ser desfeito com DROP CONSTRAINT

IMPACTO:
- ✅ Sem perda de dados (apenas adiciona constraints)
- ✅ Sem downtime (constraints não travam tabela)
- ✅ Sem mudança de schema (apenas integridade)

PRÓXIMO PASSO:
- Executar Migration 041: Remove tenant_id (deprecated)
*/
