-- =============================================================================
-- Migration 032: Distribuição Automática de Leads na Recepção
-- Sistema de push automático 24/7 para corretores no plantão
-- Data: 2026-02-03
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. ADICIONAR CAMPO leads_ativos NA PRESENÇA
-- Controla quantos leads ativos o corretor possui (máximo 5)
-- ============================================================================

ALTER TABLE recepcao_presencas
ADD COLUMN IF NOT EXISTS leads_ativos INTEGER DEFAULT 0;

COMMENT ON COLUMN recepcao_presencas.leads_ativos IS 'Quantidade de leads ativos do corretor (máximo 5 para receber novos)';

-- ============================================================================
-- 2. ADICIONAR ORIGEM 'sistema' NAS ATRIBUIÇÕES
-- Para diferenciar leads distribuídos automaticamente
-- ============================================================================

-- Verificar e atualizar a constraint de lead_origem para incluir 'sistema'
ALTER TABLE recepcao_atribuicoes
DROP CONSTRAINT IF EXISTS recepcao_atribuicoes_lead_origem_check;

ALTER TABLE recepcao_atribuicoes
ADD CONSTRAINT recepcao_atribuicoes_lead_origem_check
CHECK (lead_origem IN ('presencial', 'telefone', 'whatsapp', 'sistema'));

-- Atualizar comentário
COMMENT ON COLUMN recepcao_atribuicoes.lead_origem IS 'Origem do lead: presencial, telefone, whatsapp, sistema (distribuição automática)';

-- ============================================================================
-- 3. ADICIONAR CAMPO feedback_prazo NAS ATRIBUIÇÕES
-- Prazo de 24h para enviar feedback
-- ============================================================================

-- O campo já existe na migração 031, mas vamos garantir que existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recepcao_atribuicoes' AND column_name = 'feedback_prazo'
  ) THEN
    ALTER TABLE recepcao_atribuicoes ADD COLUMN feedback_prazo TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

COMMENT ON COLUMN recepcao_atribuicoes.feedback_prazo IS 'Prazo máximo para enviar feedback (24h após atribuição)';

-- ============================================================================
-- 4. ÍNDICES PARA DISTRIBUIÇÃO AUTOMÁTICA
-- ============================================================================

-- Índice para buscar corretores disponíveis com limite de leads
CREATE INDEX IF NOT EXISTS idx_recepcao_presencas_disponiveis_limite
ON recepcao_presencas(plantao_id, posicao_fila, leads_ativos)
WHERE status = 'presente'
  AND em_atendimento = false
  AND pausado = false
  AND feedback_pendente = false;

-- Índice para buscar atribuições pendentes de feedback (prazo expirado)
CREATE INDEX IF NOT EXISTS idx_recepcao_atribuicoes_feedback_pendente
ON recepcao_atribuicoes(user_id, atribuido_at)
WHERE feedback_status IS NULL;

-- ============================================================================
-- 5. FUNÇÃO: get_proximo_corretor_com_limite
-- Retorna próximo corretor disponível considerando limite de leads ativos
-- ============================================================================

CREATE OR REPLACE FUNCTION get_proximo_corretor_com_limite(
  p_plantao_id UUID,
  p_max_leads_ativos INTEGER DEFAULT 5
) RETURNS TABLE (
  presenca_id UUID,
  user_id UUID,
  user_nome VARCHAR,
  user_telefone VARCHAR,
  posicao_fila INTEGER,
  leads_ativos INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS presenca_id,
    p.user_id,
    u.nome::VARCHAR AS user_nome,
    u.telefone::VARCHAR AS user_telefone,
    p.posicao_fila,
    p.leads_ativos
  FROM recepcao_presencas p
  JOIN users u ON u.id = p.user_id
  WHERE p.plantao_id = p_plantao_id
    AND p.status = 'presente'
    AND p.em_atendimento = false
    AND p.pausado = false
    AND p.feedback_pendente = false
    AND p.leads_ativos < p_max_leads_ativos
  ORDER BY p.posicao_fila ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_proximo_corretor_com_limite IS 'Retorna próximo corretor disponível na fila respeitando limite de leads ativos';

-- ============================================================================
-- 6. FUNÇÃO: distribuir_lead_auto
-- Distribui um lead automaticamente para o próximo corretor disponível
-- ============================================================================

CREATE OR REPLACE FUNCTION distribuir_lead_auto(
  p_workspace_id INTEGER,
  p_plantao_id UUID,
  p_cvcrm_lead_id INTEGER,
  p_lead_nome VARCHAR,
  p_lead_telefone VARCHAR,
  p_lead_email VARCHAR DEFAULT NULL,
  p_max_leads_ativos INTEGER DEFAULT 5
) RETURNS TABLE (
  atribuicao_id UUID,
  corretor_user_id UUID,
  corretor_nome VARCHAR,
  corretor_telefone VARCHAR,
  sucesso BOOLEAN,
  mensagem TEXT
) AS $$
DECLARE
  v_corretor RECORD;
  v_atribuicao_id UUID;
  v_presenca_id UUID;
BEGIN
  -- Buscar próximo corretor disponível
  SELECT * INTO v_corretor
  FROM get_proximo_corretor_com_limite(p_plantao_id, p_max_leads_ativos);

  IF v_corretor IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::UUID,
      NULL::VARCHAR,
      NULL::VARCHAR,
      false,
      'Nenhum corretor disponível na fila'::TEXT;
    RETURN;
  END IF;

  v_presenca_id := v_corretor.presenca_id;

  -- Criar atribuição
  v_atribuicao_id := gen_random_uuid();

  INSERT INTO recepcao_atribuicoes (
    id,
    workspace_id,
    plantao_id,
    presenca_id,
    user_id,
    cvcrm_lead_id,
    lead_nome,
    lead_telefone,
    lead_email,
    lead_origem,
    atribuido_at,
    feedback_prazo
  ) VALUES (
    v_atribuicao_id,
    p_workspace_id,
    p_plantao_id,
    v_presenca_id,
    v_corretor.user_id,
    p_cvcrm_lead_id,
    p_lead_nome,
    p_lead_telefone,
    p_lead_email,
    'sistema',
    NOW(),
    NOW() + INTERVAL '24 hours'
  );

  -- Incrementar contador de leads ativos
  UPDATE recepcao_presencas
  SET leads_ativos = leads_ativos + 1,
      updated_at = NOW()
  WHERE id = v_presenca_id;

  -- Mover corretor para fim da fila
  PERFORM mover_corretor_fim_fila(v_presenca_id);

  RETURN QUERY SELECT
    v_atribuicao_id,
    v_corretor.user_id,
    v_corretor.user_nome,
    v_corretor.user_telefone,
    true,
    'Lead distribuído com sucesso'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION distribuir_lead_auto IS 'Distribui um lead automaticamente para o próximo corretor da fila';

-- ============================================================================
-- 7. FUNÇÃO: verificar_feedback_pendente
-- Marca corretores com feedback pendente (prazo de 24h expirado)
-- ============================================================================

CREATE OR REPLACE FUNCTION verificar_feedback_pendente()
RETURNS TABLE (
  user_id UUID,
  user_nome VARCHAR,
  atribuicoes_pendentes INTEGER
) AS $$
BEGIN
  -- Atualizar flag feedback_pendente para corretores com leads não respondidos há mais de 24h
  WITH corretores_pendentes AS (
    SELECT DISTINCT a.user_id
    FROM recepcao_atribuicoes a
    JOIN recepcao_presencas p ON p.id = a.presenca_id
    WHERE a.feedback_status IS NULL
      AND a.atribuido_at < NOW() - INTERVAL '24 hours'
      AND p.status = 'presente'
  )
  UPDATE recepcao_presencas rp
  SET feedback_pendente = true,
      updated_at = NOW()
  FROM corretores_pendentes cp
  WHERE rp.user_id = cp.user_id
    AND rp.status = 'presente'
    AND rp.feedback_pendente = false;

  -- Retornar lista de corretores com pendências
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.nome::VARCHAR AS user_nome,
    COUNT(a.id)::INTEGER AS atribuicoes_pendentes
  FROM users u
  JOIN recepcao_atribuicoes a ON a.user_id = u.id
  WHERE a.feedback_status IS NULL
    AND a.atribuido_at < NOW() - INTERVAL '24 hours'
  GROUP BY u.id, u.nome;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verificar_feedback_pendente IS 'Verifica e marca corretores com feedback pendente (prazo 24h expirado)';

-- ============================================================================
-- 8. FUNÇÃO: registrar_feedback
-- Registra feedback de uma atribuição e atualiza contador de leads ativos
-- ============================================================================

CREATE OR REPLACE FUNCTION registrar_feedback(
  p_atribuicao_id UUID,
  p_feedback_status VARCHAR,
  p_feedback_observacoes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_atribuicao RECORD;
BEGIN
  -- Buscar atribuição
  SELECT * INTO v_atribuicao
  FROM recepcao_atribuicoes
  WHERE id = p_atribuicao_id;

  IF v_atribuicao IS NULL THEN
    RAISE EXCEPTION 'Atribuição não encontrada: %', p_atribuicao_id;
  END IF;

  IF v_atribuicao.feedback_status IS NOT NULL THEN
    RAISE EXCEPTION 'Feedback já foi registrado para esta atribuição';
  END IF;

  -- Registrar feedback
  UPDATE recepcao_atribuicoes
  SET feedback_status = p_feedback_status,
      feedback_observacoes = p_feedback_observacoes,
      feedback_at = NOW(),
      updated_at = NOW()
  WHERE id = p_atribuicao_id;

  -- Decrementar contador de leads ativos
  UPDATE recepcao_presencas
  SET leads_ativos = GREATEST(leads_ativos - 1, 0),
      updated_at = NOW()
  WHERE id = v_atribuicao.presenca_id;

  -- Verificar se corretor tinha flag feedback_pendente e pode ser liberado
  UPDATE recepcao_presencas p
  SET feedback_pendente = false,
      updated_at = NOW()
  WHERE p.id = v_atribuicao.presenca_id
    AND p.feedback_pendente = true
    AND NOT EXISTS (
      SELECT 1 FROM recepcao_atribuicoes a
      WHERE a.presenca_id = p.id
        AND a.feedback_status IS NULL
        AND a.atribuido_at < NOW() - INTERVAL '24 hours'
    );

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION registrar_feedback IS 'Registra feedback de uma atribuição e atualiza o contador de leads ativos';

-- ============================================================================
-- 9. VIEW: Leads disponíveis para distribuição
-- Leads do CV CRM sem corretor atribuído
-- ============================================================================

CREATE OR REPLACE VIEW v_leads_para_distribuir AS
SELECT
  l.id,
  l.cvcrm_id,
  l.nome,
  l.telefone,
  l.celular,
  l.email,
  l.origem,
  l.situacao_nome,
  l.workspace_id,
  l.created_at,
  -- Priorizar leads mais antigos
  EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 3600 AS horas_aguardando
FROM cvcrm_leads l
WHERE l.corretor_id IS NULL
  AND l.situacao_nome NOT IN ('Fechado', 'Perdido', 'Descartado', 'Inativo')
ORDER BY l.created_at ASC;

COMMENT ON VIEW v_leads_para_distribuir IS 'Leads do CV CRM disponíveis para distribuição automática';

-- ============================================================================
-- 10. VIEW: Status de corretores na fila com limite
-- ============================================================================

CREATE OR REPLACE VIEW v_recepcao_fila_status AS
SELECT
  p.id AS presenca_id,
  p.plantao_id,
  p.user_id,
  u.nome AS corretor_nome,
  u.telefone AS corretor_telefone,
  u.avatar_url AS corretor_avatar,
  p.posicao_fila,
  p.status,
  p.checkin_at,
  p.checkin_method,
  p.em_atendimento,
  p.pausado,
  p.feedback_pendente,
  p.leads_ativos,
  p.workspace_id,
  -- Status legível
  CASE
    WHEN p.leads_ativos >= 5 THEN 'Limite de leads atingido'
    WHEN p.em_atendimento THEN 'Em atendimento'
    WHEN p.pausado THEN 'Pausado'
    WHEN p.feedback_pendente THEN 'Aguardando feedback (bloqueado)'
    WHEN p.status != 'presente' THEN 'Ausente'
    ELSE 'Disponível'
  END AS status_legivel,
  -- Pode receber lead?
  (p.status = 'presente'
    AND NOT p.em_atendimento
    AND NOT p.pausado
    AND NOT p.feedback_pendente
    AND p.leads_ativos < 5) AS disponivel
FROM recepcao_presencas p
JOIN users u ON u.id = p.user_id
ORDER BY p.posicao_fila;

COMMENT ON VIEW v_recepcao_fila_status IS 'View da fila de corretores com status detalhado incluindo limite de leads';

-- ============================================================================
-- 11. TABELA: Log de distribuição automática
-- Para auditoria e métricas
-- ============================================================================

CREATE TABLE IF NOT EXISTS recepcao_distribuicao_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plantao_id UUID REFERENCES recepcao_plantoes(id) ON DELETE SET NULL,
  atribuicao_id UUID REFERENCES recepcao_atribuicoes(id) ON DELETE SET NULL,
  cvcrm_lead_id INTEGER,
  corretor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sucesso BOOLEAN NOT NULL,
  mensagem TEXT,
  notificacao_enviada BOOLEAN DEFAULT false,
  notificacao_tipo VARCHAR(20), -- 'whatsapp', 'push', 'email'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recepcao_distribuicao_log_workspace ON recepcao_distribuicao_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_distribuicao_log_plantao ON recepcao_distribuicao_log(plantao_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_distribuicao_log_created ON recepcao_distribuicao_log(created_at);

COMMENT ON TABLE recepcao_distribuicao_log IS 'Log de tentativas de distribuição automática de leads';

-- ============================================================================
-- 12. VIEW: Métricas de distribuição
-- ============================================================================

CREATE OR REPLACE VIEW v_recepcao_distribuicao_metricas AS
SELECT
  p.workspace_id,
  p.id AS plantao_id,
  p.data AS plantao_data,
  l.nome AS local_nome,
  -- Total de distribuições
  COUNT(DISTINCT a.id) AS total_distribuicoes,
  -- Por origem
  COUNT(DISTINCT CASE WHEN a.lead_origem = 'presencial' THEN a.id END) AS dist_presencial,
  COUNT(DISTINCT CASE WHEN a.lead_origem = 'telefone' THEN a.id END) AS dist_telefone,
  COUNT(DISTINCT CASE WHEN a.lead_origem = 'whatsapp' THEN a.id END) AS dist_whatsapp,
  COUNT(DISTINCT CASE WHEN a.lead_origem = 'sistema' THEN a.id END) AS dist_sistema,
  -- Feedbacks
  COUNT(DISTINCT CASE WHEN a.feedback_status IS NOT NULL THEN a.id END) AS com_feedback,
  COUNT(DISTINCT CASE WHEN a.feedback_status IS NULL THEN a.id END) AS sem_feedback,
  -- Resultados positivos
  COUNT(DISTINCT CASE WHEN a.feedback_status IN ('interessado', 'agendou_visita', 'fechou_negocio') THEN a.id END) AS resultados_positivos,
  -- Tempo médio de feedback (em horas)
  ROUND(AVG(EXTRACT(EPOCH FROM (a.feedback_at - a.atribuido_at)) / 3600)::NUMERIC, 2) AS tempo_medio_feedback_horas
FROM recepcao_plantoes p
JOIN recepcao_locais l ON l.id = p.local_id
LEFT JOIN recepcao_atribuicoes a ON a.plantao_id = p.id
GROUP BY p.workspace_id, p.id, p.data, l.nome;

COMMENT ON VIEW v_recepcao_distribuicao_metricas IS 'Métricas agregadas de distribuição de leads por plantão';

COMMIT;
