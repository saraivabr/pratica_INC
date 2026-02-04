-- =============================================================================
-- Migration 035: Fix Race Conditions in Queue Functions
-- Adds proper locking to prevent concurrent modification issues
-- Data: 2026-02-04
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX: realizar_sorteio - Add locking for atomic sorteio
-- Problem: ROW_NUMBER() OVER (ORDER BY RANDOM()) is non-deterministic
-- and concurrent executions can assign different positions
-- ============================================================================

CREATE OR REPLACE FUNCTION realizar_sorteio(p_plantao_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_nome VARCHAR,
  sorteio_posicao INTEGER
) AS $$
DECLARE
  v_sorteio_realizado BOOLEAN;
BEGIN
  -- Lock the plantao row to prevent concurrent sorteio
  SELECT sorteio_realizado INTO v_sorteio_realizado
  FROM recepcao_plantoes
  WHERE id = p_plantao_id
  FOR UPDATE;

  IF v_sorteio_realizado THEN
    RAISE EXCEPTION 'Sorteio já foi realizado para este plantão';
  END IF;

  -- Lock all presencas for this plantao to ensure atomic update
  PERFORM 1 FROM recepcao_presencas
  WHERE plantao_id = p_plantao_id AND status = 'presente'
  FOR UPDATE;

  -- Realizar sorteio: atribuir posições aleatórias with locked rows
  WITH presentes AS (
    SELECT p.id, p.user_id, ROW_NUMBER() OVER (ORDER BY RANDOM()) AS nova_posicao
    FROM recepcao_presencas p
    WHERE p.plantao_id = p_plantao_id
      AND p.status = 'presente'
  )
  UPDATE recepcao_presencas rp
  SET sorteio_posicao = pr.nova_posicao,
      posicao_fila = pr.nova_posicao,
      updated_at = NOW()
  FROM presentes pr
  WHERE rp.id = pr.id;

  -- Marcar sorteio como realizado
  UPDATE recepcao_plantoes
  SET sorteio_realizado = true,
      sorteio_at = NOW(),
      updated_at = NOW()
  WHERE id = p_plantao_id;

  -- Retornar resultado do sorteio
  RETURN QUERY
  SELECT
    p.user_id,
    u.nome::VARCHAR AS user_nome,
    p.sorteio_posicao
  FROM recepcao_presencas p
  JOIN users u ON u.id = p.user_id
  WHERE p.plantao_id = p_plantao_id
    AND p.status = 'presente'
  ORDER BY p.sorteio_posicao;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION realizar_sorteio IS 'Realiza o sorteio diário com locking para prevenir race conditions';

-- ============================================================================
-- 2. FIX: mover_corretor_fim_fila - Add row locking
-- Problem: Two separate operations (MAX + UPDATE) without lock
-- ============================================================================

CREATE OR REPLACE FUNCTION mover_corretor_fim_fila(p_presenca_id UUID)
RETURNS VOID AS $$
DECLARE
  v_plantao_id UUID;
  v_max_posicao INTEGER;
BEGIN
  -- Lock the presenca row first
  SELECT plantao_id INTO v_plantao_id
  FROM recepcao_presencas
  WHERE id = p_presenca_id
  FOR UPDATE;

  IF v_plantao_id IS NULL THEN
    RAISE EXCEPTION 'Presença não encontrada: %', p_presenca_id;
  END IF;

  -- Lock all presencas for this plantao to ensure atomic renumbering
  PERFORM 1 FROM recepcao_presencas
  WHERE plantao_id = v_plantao_id AND status = 'presente'
  FOR UPDATE;

  -- Obter maior posição atual (now safe due to lock)
  SELECT COALESCE(MAX(posicao_fila), 0) INTO v_max_posicao
  FROM recepcao_presencas
  WHERE plantao_id = v_plantao_id
    AND status = 'presente';

  -- Mover corretor para o fim
  UPDATE recepcao_presencas
  SET posicao_fila = v_max_posicao + 1,
      updated_at = NOW()
  WHERE id = p_presenca_id;

  -- Renumerar fila para evitar gaps (rows already locked)
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY posicao_fila) AS nova_posicao
    FROM recepcao_presencas
    WHERE plantao_id = v_plantao_id
      AND status = 'presente'
  )
  UPDATE recepcao_presencas p
  SET posicao_fila = n.nova_posicao,
      updated_at = NOW()
  FROM numbered n
  WHERE p.id = n.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mover_corretor_fim_fila IS 'Move corretor para o fim da fila com locking para prevenir race conditions';

-- ============================================================================
-- 3. FIX: distribuir_lead_auto - Add locking for leads_ativos counter
-- Problem: leads_ativos updated without lock, can violate 5-lead limit
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
  v_leads_ativos INTEGER;
BEGIN
  -- Lock and find next available corretor atomically
  SELECT
    p.id AS presenca_id,
    p.user_id,
    u.nome::VARCHAR AS user_nome,
    u.telefone::VARCHAR AS user_telefone,
    p.posicao_fila,
    p.leads_ativos
  INTO v_corretor
  FROM recepcao_presencas p
  JOIN users u ON u.id = p.user_id
  WHERE p.plantao_id = p_plantao_id
    AND p.status = 'presente'
    AND p.em_atendimento = false
    AND p.pausado = false
    AND p.feedback_pendente = false
    AND p.leads_ativos < p_max_leads_ativos
  ORDER BY p.posicao_fila ASC
  LIMIT 1
  FOR UPDATE OF p SKIP LOCKED;

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

  -- Double check leads_ativos after lock (belt and suspenders)
  SELECT leads_ativos INTO v_leads_ativos
  FROM recepcao_presencas
  WHERE id = v_presenca_id;

  IF v_leads_ativos >= p_max_leads_ativos THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::UUID,
      NULL::VARCHAR,
      NULL::VARCHAR,
      false,
      'Corretor atingiu limite de leads ativos'::TEXT;
    RETURN;
  END IF;

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

  -- Incrementar contador de leads ativos (row already locked)
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

COMMENT ON FUNCTION distribuir_lead_auto IS 'Distribui lead com locking atômico para garantir limite de 5 leads';

-- ============================================================================
-- 4. FIX: registrar_oferta - Add workspace_id filter to position query
-- Problem: Query de posição não filtra por workspace_id
-- ============================================================================

CREATE OR REPLACE FUNCTION registrar_oferta(
  p_workspace_id INTEGER,
  p_plantao_id UUID,
  p_presenca_id UUID,
  p_user_id UUID,
  p_empreendimento_id INTEGER,
  p_empreendimento_nome VARCHAR,
  p_lead_origem VARCHAR,
  p_lead_telefone VARCHAR DEFAULT NULL,
  p_lead_nome VARCHAR DEFAULT NULL
) RETURNS TABLE (
  oferta_id UUID,
  total_ofertas INTEGER,
  qualificado BOOLEAN,
  faltam INTEGER
) AS $$
DECLARE
  v_oferta_id UUID;
  v_total_ofertas INTEGER;
  v_meta_ofertas INTEGER;
  v_qualificado BOOLEAN;
  v_qualificacao_id UUID;
  v_ja_qualificado BOOLEAN;
BEGIN
  -- Buscar meta de ofertas do plantão
  SELECT COALESCE(meta_ofertas, 30) INTO v_meta_ofertas
  FROM recepcao_plantoes
  WHERE id = p_plantao_id;

  -- Inserir a oferta
  v_oferta_id := gen_random_uuid();

  INSERT INTO roleta_ofertas (
    id, workspace_id, plantao_id, presenca_id, user_id,
    empreendimento_id, empreendimento_nome,
    lead_origem, lead_telefone, lead_nome
  ) VALUES (
    v_oferta_id, p_workspace_id, p_plantao_id, p_presenca_id, p_user_id,
    p_empreendimento_id, p_empreendimento_nome,
    p_lead_origem, p_lead_telefone, p_lead_nome
  );

  -- Contar total de ofertas do corretor neste plantão
  SELECT COUNT(*) INTO v_total_ofertas
  FROM roleta_ofertas
  WHERE plantao_id = p_plantao_id AND user_id = p_user_id;

  -- Verificar se já estava qualificado antes
  SELECT qualificado INTO v_ja_qualificado
  FROM roleta_qualificacao
  WHERE plantao_id = p_plantao_id AND user_id = p_user_id;

  -- Verificar se já está qualificado
  v_qualificado := v_total_ofertas >= v_meta_ofertas;

  -- Atualizar ou inserir qualificação
  INSERT INTO roleta_qualificacao (
    workspace_id, plantao_id, presenca_id, user_id,
    qualificado, qualificado_at, total_ofertas
  ) VALUES (
    p_workspace_id, p_plantao_id, p_presenca_id, p_user_id,
    v_qualificado,
    CASE WHEN v_qualificado THEN NOW() ELSE NULL END,
    v_total_ofertas
  )
  ON CONFLICT (plantao_id, user_id) DO UPDATE SET
    qualificado = EXCLUDED.qualificado OR roleta_qualificacao.qualificado,
    qualificado_at = CASE
      WHEN EXCLUDED.qualificado AND NOT roleta_qualificacao.qualificado THEN NOW()
      ELSE roleta_qualificacao.qualificado_at
    END,
    total_ofertas = EXCLUDED.total_ofertas,
    updated_at = NOW();

  -- Se acabou de se qualificar (não era qualificado antes), definir posição na fila de leads
  -- FIXED: Added workspace_id filter to prevent cross-workspace pollution
  IF v_qualificado AND NOT COALESCE(v_ja_qualificado, false) THEN
    UPDATE roleta_qualificacao
    SET posicao_roleta_leads = (
      SELECT COALESCE(MAX(posicao_roleta_leads), 0) + 1
      FROM roleta_qualificacao
      WHERE plantao_id = p_plantao_id
        AND workspace_id = p_workspace_id
        AND qualificado = true
    )
    WHERE plantao_id = p_plantao_id
      AND user_id = p_user_id
      AND workspace_id = p_workspace_id
      AND posicao_roleta_leads IS NULL;
  END IF;

  RETURN QUERY SELECT
    v_oferta_id,
    v_total_ofertas,
    v_qualificado,
    GREATEST(v_meta_ofertas - v_total_ofertas, 0)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION registrar_oferta IS 'Registra oferta com workspace isolation correto';

-- ============================================================================
-- 5. FIX: registrar_feedback - Add locking for atomic decrement
-- ============================================================================

CREATE OR REPLACE FUNCTION registrar_feedback(
  p_atribuicao_id UUID,
  p_feedback_status VARCHAR,
  p_feedback_observacoes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_atribuicao RECORD;
BEGIN
  -- Lock the atribuicao row first
  SELECT * INTO v_atribuicao
  FROM recepcao_atribuicoes
  WHERE id = p_atribuicao_id
  FOR UPDATE;

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

  -- Lock and decrement contador de leads ativos atomically
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

COMMENT ON FUNCTION registrar_feedback IS 'Registra feedback com locking atômico';

COMMIT;
