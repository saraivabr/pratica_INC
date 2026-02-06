-- Migration 066: Add Composite Indexes for Performance (Phase 4)
-- Replaces outdated 048 migration with correct column names
-- Uses CREATE INDEX CONCURRENTLY (cannot run inside transaction)
-- Duration: ~1-3 minutes depending on table sizes

-- ============================================================================
-- STEP 1: cvcrm_leads - most queried table
-- ============================================================================

-- Already exists: idx_cvcrm_leads_ws_situacao (workspace_id, situacao_id)
-- Already exists: idx_cvcrm_leads_ws_corretor (workspace_id, corretor_id)
-- Already exists: idx_cvcrm_leads_workspace_data (workspace_id, data_cad DESC)
-- Already exists: idx_cvcrm_leads_workspace_created (workspace_id, created_at DESC)

-- Leads by workspace + imobiliaria (for filtering by imobiliaria)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_ws_imobiliaria
  ON cvcrm_leads(workspace_id, imobiliaria_id)
  WHERE imobiliaria_id IS NOT NULL;

-- Leads with score (for lead scoring dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_ws_score
  ON cvcrm_leads(workspace_id, score DESC NULLS LAST)
  WHERE score IS NOT NULL;

-- Leads phone lookup (for WhatsApp matching)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_ws_telefone
  ON cvcrm_leads(workspace_id, telefone)
  WHERE telefone IS NOT NULL;

-- Leads celular lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_ws_celular
  ON cvcrm_leads(workspace_id, celular)
  WHERE celular IS NOT NULL;

-- ============================================================================
-- STEP 2: cvcrm_leads_interacoes - lead interaction history
-- ============================================================================

-- Interactions by lead (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_leads_interacoes_ws_id_lead
  ON cvcrm_leads_interacoes(workspace_id, id_lead);

-- ============================================================================
-- STEP 3: cvcrm_lead_interacoes - CV CRM synced interactions
-- ============================================================================

-- Interactions by lead ID from CV CRM
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_lead_interacoes_ws_lead
  ON cvcrm_lead_interacoes(workspace_id, cvcrm_lead_id);

-- Interactions by type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_lead_interacoes_ws_tipo
  ON cvcrm_lead_interacoes(workspace_id, tipo);

-- ============================================================================
-- STEP 4: whatsapp_messages - message history
-- ============================================================================

-- Messages by workspace + phone (chat history)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_ws_phone
  ON whatsapp_messages(workspace_id, phone_number);

-- Messages by workspace + timestamp (recent messages)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_ws_created
  ON whatsapp_messages(workspace_id, created_at DESC);

-- Messages by type (filtering media, text, etc)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_ws_type
  ON whatsapp_messages(workspace_id, message_type, created_at DESC);

-- ============================================================================
-- STEP 5: recepcao tables
-- ============================================================================

-- Presencas by plantao + position (queue ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recepcao_presencas_plantao_posicao
  ON recepcao_presencas(plantao_id, posicao_fila);

-- Atribuicoes by presenca + date (attribution history)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recepcao_atribuicoes_presenca_data
  ON recepcao_atribuicoes(presenca_id, created_at DESC);

-- Atribuicoes pending feedback
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recepcao_atribuicoes_ws_feedback
  ON recepcao_atribuicoes(workspace_id, feedback_status)
  WHERE feedback_status IS NULL;

-- ============================================================================
-- STEP 6: comissao tables
-- ============================================================================

-- Vendas by workspace + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comissao_vendas_ws_status
  ON comissao_vendas(workspace_id, status);

-- Vendas by workspace + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comissao_vendas_ws_data
  ON comissao_vendas(workspace_id, data_venda DESC);

-- Matriz by venda + parcela
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comissao_matriz_venda_parcela
  ON comissao_matriz(venda_id, parcela_id);

-- Parcelas by venda + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comissao_parcelas_venda_status
  ON comissao_parcelas(venda_id, status);

-- ============================================================================
-- STEP 7: agendamentos
-- ============================================================================

-- Agendamentos by workspace + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_ws_data
  ON agendamentos(workspace_id, data_agendamento DESC);

-- Pending agendamentos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agendamentos_ws_pendentes
  ON agendamentos(workspace_id, data_agendamento)
  WHERE status != 'confirmado';

-- ============================================================================
-- STEP 8: eventos
-- ============================================================================

-- Eventos by workspace + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_eventos_ws_data
  ON eventos(workspace_id, data_hora DESC);

-- Convidados by evento + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evento_convidados_evento_confirmacao
  ON evento_convidados(evento_id, status);

-- ============================================================================
-- STEP 9: salva_leads_conversations
-- ============================================================================

-- Conversations by lead phone + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salva_leads_conv_phone_status
  ON salva_leads_conversations(lead_phone, status);

-- Active conversations by workspace
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_salva_leads_conv_ws_status
  ON salva_leads_conversations(workspace_id, status)
  WHERE status IN ('active', 'pending', 'debouncing');

-- ============================================================================
-- STEP 10: academy
-- ============================================================================

-- Progress by user + lesson
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_progress_user_lesson
  ON academy_progress(user_id, lesson_id);

-- Certificates by user + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_certificates_user_data
  ON academy_certificates(user_id, emitido_em DESC);

-- ============================================================================
-- STEP 11: cvcrm_reservas
-- ============================================================================

-- Reservas by workspace + date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_reservas_ws_data
  ON cvcrm_reservas(workspace_id, data_reserva DESC);

-- Reservas by empreendimento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cvcrm_reservas_empreendimento_data
  ON cvcrm_reservas(empreendimento_id, data_reserva DESC);

-- ============================================================================
-- STEP 12: Update statistics
-- ============================================================================

ANALYZE;
