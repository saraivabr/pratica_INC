-- =============================================================================
-- Migration 033: Sistema Roleta Completo - UX Aprimorada
-- Ofertas, Qualificação, Gamificação (Estrelas/PIX), Sorteio, Fila Dupla
-- Data: 2026-02-04
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. ADICIONAR CAMPOS AO PLANTÃO
-- Configurações de UX: hora limite check-in, sorteio, meta ofertas
-- ============================================================================

ALTER TABLE recepcao_plantoes
ADD COLUMN IF NOT EXISTS hora_limite_checkin TIME,
ADD COLUMN IF NOT EXISTS sorteio_realizado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sorteio_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS meta_ofertas INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS mensagem_boas_vindas TEXT;

COMMENT ON COLUMN recepcao_plantoes.hora_limite_checkin IS 'Hora limite para fazer check-in no plantão';
COMMENT ON COLUMN recepcao_plantoes.sorteio_realizado IS 'Se o sorteio diário já foi realizado';
COMMENT ON COLUMN recepcao_plantoes.sorteio_at IS 'Momento em que o sorteio foi realizado';
COMMENT ON COLUMN recepcao_plantoes.meta_ofertas IS 'Meta de ofertas para se qualificar para roleta de leads (default 30)';
COMMENT ON COLUMN recepcao_plantoes.mensagem_boas_vindas IS 'Mensagem customizável de boas-vindas';

-- ============================================================================
-- 2. ADICIONAR CAMPOS À PRESENÇA
-- Posição no sorteio e posição na fila de leads (filas separadas)
-- ============================================================================

ALTER TABLE recepcao_presencas
ADD COLUMN IF NOT EXISTS sorteio_posicao INTEGER,
ADD COLUMN IF NOT EXISTS posicao_fila_leads INTEGER;

COMMENT ON COLUMN recepcao_presencas.sorteio_posicao IS 'Posição definida pelo sorteio diário (fila da portaria)';
COMMENT ON COLUMN recepcao_presencas.posicao_fila_leads IS 'Posição na fila de leads externos (só para qualificados)';

-- ============================================================================
-- 3. EXPANDIR ORIGENS DE LEAD
-- Adicionar novas origens: facebook, instagram, qr_terreno, base_marketing
-- ============================================================================

ALTER TABLE recepcao_atribuicoes
DROP CONSTRAINT IF EXISTS recepcao_atribuicoes_lead_origem_check;

ALTER TABLE recepcao_atribuicoes
ADD CONSTRAINT recepcao_atribuicoes_lead_origem_check
CHECK (lead_origem IN (
  'presencial', 'facebook', 'instagram', 'qr_terreno',
  'telefone', 'base_marketing', 'whatsapp', 'sistema'
));

COMMENT ON COLUMN recepcao_atribuicoes.lead_origem IS 'Origem do lead: presencial, facebook, instagram, qr_terreno, telefone, base_marketing, whatsapp, sistema';

-- ============================================================================
-- 4. TABELA: roleta_ofertas
-- Registro de ofertas/ligações feitas pelos corretores
-- ============================================================================

CREATE TABLE IF NOT EXISTS roleta_ofertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plantao_id UUID NOT NULL REFERENCES recepcao_plantoes(id) ON DELETE CASCADE,
  presenca_id UUID NOT NULL REFERENCES recepcao_presencas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Empreendimento oferecido
  empreendimento_id INTEGER,
  empreendimento_nome VARCHAR(255),

  -- Dados do contato
  lead_origem VARCHAR(50) NOT NULL, -- ligacao, whatsapp, presencial, facebook, instagram, qr_terreno
  lead_telefone VARCHAR(50),
  lead_nome VARCHAR(255),

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roleta_ofertas_workspace ON roleta_ofertas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_roleta_ofertas_plantao ON roleta_ofertas(plantao_id);
CREATE INDEX IF NOT EXISTS idx_roleta_ofertas_presenca ON roleta_ofertas(presenca_id);
CREATE INDEX IF NOT EXISTS idx_roleta_ofertas_user ON roleta_ofertas(user_id);
CREATE INDEX IF NOT EXISTS idx_roleta_ofertas_created ON roleta_ofertas(created_at);
CREATE INDEX IF NOT EXISTS idx_roleta_ofertas_user_plantao ON roleta_ofertas(user_id, plantao_id);

COMMENT ON TABLE roleta_ofertas IS 'Registro de ofertas/ligações feitas pelos corretores no plantão';
COMMENT ON COLUMN roleta_ofertas.lead_origem IS 'Origem do contato: ligacao, whatsapp, presencial, facebook, instagram, qr_terreno';

-- Trigger para updated_at (não necessário pois a tabela é append-only)

-- ============================================================================
-- 5. TABELA: roleta_qualificacao
-- Status de qualificação do corretor para a roleta de leads
-- ============================================================================

CREATE TABLE IF NOT EXISTS roleta_qualificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plantao_id UUID NOT NULL REFERENCES recepcao_plantoes(id) ON DELETE CASCADE,
  presenca_id UUID NOT NULL REFERENCES recepcao_presencas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Status de qualificação
  qualificado BOOLEAN DEFAULT false,
  qualificado_at TIMESTAMP WITH TIME ZONE,

  -- Posição na roleta de leads
  posicao_roleta_leads INTEGER,

  -- Contador de ofertas
  total_ofertas INTEGER DEFAULT 0,

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Uma qualificação por corretor por plantão
  UNIQUE(plantao_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roleta_qualificacao_workspace ON roleta_qualificacao(workspace_id);
CREATE INDEX IF NOT EXISTS idx_roleta_qualificacao_plantao ON roleta_qualificacao(plantao_id);
CREATE INDEX IF NOT EXISTS idx_roleta_qualificacao_user ON roleta_qualificacao(user_id);
CREATE INDEX IF NOT EXISTS idx_roleta_qualificacao_qualificado ON roleta_qualificacao(plantao_id, qualificado) WHERE qualificado = true;

COMMENT ON TABLE roleta_qualificacao IS 'Status de qualificação do corretor para receber leads externos';
COMMENT ON COLUMN roleta_qualificacao.qualificado IS 'Se o corretor atingiu a meta de ofertas';
COMMENT ON COLUMN roleta_qualificacao.posicao_roleta_leads IS 'Posição na fila de leads externos';
COMMENT ON COLUMN roleta_qualificacao.total_ofertas IS 'Total de ofertas registradas no plantão';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_roleta_qualificacao_updated_at ON roleta_qualificacao;
CREATE TRIGGER update_roleta_qualificacao_updated_at
  BEFORE UPDATE ON roleta_qualificacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. TABELA: roleta_gamificacao
-- Sistema de estrelas e recompensas (PIX)
-- ============================================================================

CREATE TABLE IF NOT EXISTS roleta_gamificacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plantao_id UUID REFERENCES recepcao_plantoes(id) ON DELETE SET NULL,

  -- Tipo de evento
  tipo VARCHAR(50) NOT NULL, -- estrela_agendamento, estrela_fechamento, bonus_pix

  -- Valor (quantidade de estrelas ou valor em reais)
  valor INTEGER DEFAULT 1,

  -- Referência ao registro que gerou (atribuição com agendou_visita)
  referencia_id UUID,
  referencia_tipo VARCHAR(50), -- atribuicao, oferta, etc.

  -- Resgate
  resgatado BOOLEAN DEFAULT false,
  resgatado_at TIMESTAMP WITH TIME ZONE,
  resgate_referencia VARCHAR(100), -- número do PIX/transação

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roleta_gamificacao_workspace ON roleta_gamificacao(workspace_id);
CREATE INDEX IF NOT EXISTS idx_roleta_gamificacao_user ON roleta_gamificacao(user_id);
CREATE INDEX IF NOT EXISTS idx_roleta_gamificacao_plantao ON roleta_gamificacao(plantao_id);
CREATE INDEX IF NOT EXISTS idx_roleta_gamificacao_tipo ON roleta_gamificacao(tipo);
CREATE INDEX IF NOT EXISTS idx_roleta_gamificacao_resgatado ON roleta_gamificacao(user_id, resgatado) WHERE resgatado = false;
CREATE INDEX IF NOT EXISTS idx_roleta_gamificacao_user_created ON roleta_gamificacao(user_id, created_at);

COMMENT ON TABLE roleta_gamificacao IS 'Sistema de gamificação: estrelas por agendamentos e recompensas PIX';
COMMENT ON COLUMN roleta_gamificacao.tipo IS 'Tipo de evento: estrela_agendamento (visita agendada), estrela_fechamento (negócio fechado), bonus_pix (5 estrelas)';
COMMENT ON COLUMN roleta_gamificacao.valor IS 'Valor: 1 para estrela, valor em reais para PIX';
COMMENT ON COLUMN roleta_gamificacao.resgatado IS 'Se o bônus PIX foi resgatado';

-- ============================================================================
-- 7. FUNÇÃO: registrar_oferta
-- Registra uma oferta e atualiza a qualificação automaticamente
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

  -- Se acabou de se qualificar, definir posição na fila de leads
  IF v_qualificado THEN
    UPDATE roleta_qualificacao
    SET posicao_roleta_leads = (
      SELECT COALESCE(MAX(posicao_roleta_leads), 0) + 1
      FROM roleta_qualificacao
      WHERE plantao_id = p_plantao_id AND qualificado = true
    )
    WHERE plantao_id = p_plantao_id
      AND user_id = p_user_id
      AND posicao_roleta_leads IS NULL;
  END IF;

  RETURN QUERY SELECT
    v_oferta_id,
    v_total_ofertas,
    v_qualificado,
    GREATEST(v_meta_ofertas - v_total_ofertas, 0)::INTEGER;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION registrar_oferta IS 'Registra uma oferta e atualiza a qualificação do corretor automaticamente';

-- ============================================================================
-- 8. FUNÇÃO: realizar_sorteio
-- Realiza o sorteio diário definindo a ordem da fila da portaria
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
  -- Verificar se sorteio já foi realizado
  SELECT sorteio_realizado INTO v_sorteio_realizado
  FROM recepcao_plantoes
  WHERE id = p_plantao_id;

  IF v_sorteio_realizado THEN
    RAISE EXCEPTION 'Sorteio já foi realizado para este plantão';
  END IF;

  -- Realizar sorteio: atribuir posições aleatórias
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

COMMENT ON FUNCTION realizar_sorteio IS 'Realiza o sorteio diário para definir a ordem da fila da portaria';

-- ============================================================================
-- 9. FUNÇÃO: adicionar_estrela
-- Adiciona estrela quando corretor agenda visita
-- ============================================================================

CREATE OR REPLACE FUNCTION adicionar_estrela(
  p_workspace_id INTEGER,
  p_user_id UUID,
  p_plantao_id UUID,
  p_tipo VARCHAR,
  p_referencia_id UUID DEFAULT NULL,
  p_referencia_tipo VARCHAR DEFAULT NULL
) RETURNS TABLE (
  estrela_id UUID,
  total_estrelas INTEGER,
  pode_resgatar BOOLEAN
) AS $$
DECLARE
  v_estrela_id UUID;
  v_total_estrelas INTEGER;
BEGIN
  -- Inserir estrela
  v_estrela_id := gen_random_uuid();

  INSERT INTO roleta_gamificacao (
    id, workspace_id, user_id, plantao_id,
    tipo, valor, referencia_id, referencia_tipo
  ) VALUES (
    v_estrela_id, p_workspace_id, p_user_id, p_plantao_id,
    p_tipo, 1, p_referencia_id, p_referencia_tipo
  );

  -- Contar estrelas não resgatadas
  SELECT COUNT(*) INTO v_total_estrelas
  FROM roleta_gamificacao
  WHERE user_id = p_user_id
    AND tipo LIKE 'estrela_%'
    AND resgatado = false;

  RETURN QUERY SELECT
    v_estrela_id,
    v_total_estrelas,
    v_total_estrelas >= 5;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION adicionar_estrela IS 'Adiciona estrela ao corretor e verifica se pode resgatar PIX';

-- ============================================================================
-- 10. FUNÇÃO: resgatar_pix
-- Resgata 5 estrelas por R$50 PIX
-- ============================================================================

CREATE OR REPLACE FUNCTION resgatar_pix(
  p_workspace_id INTEGER,
  p_user_id UUID
) RETURNS TABLE (
  sucesso BOOLEAN,
  resgate_id UUID,
  mensagem TEXT,
  estrelas_restantes INTEGER
) AS $$
DECLARE
  v_total_estrelas INTEGER;
  v_resgate_id UUID;
  v_estrelas_resgatadas INTEGER;
BEGIN
  -- Contar estrelas disponíveis
  SELECT COUNT(*) INTO v_total_estrelas
  FROM roleta_gamificacao
  WHERE user_id = p_user_id
    AND tipo LIKE 'estrela_%'
    AND resgatado = false;

  IF v_total_estrelas < 5 THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      'Você precisa de 5 estrelas para resgatar. Atual: ' || v_total_estrelas,
      v_total_estrelas;
    RETURN;
  END IF;

  -- Marcar 5 estrelas como resgatadas
  WITH estrelas_para_resgatar AS (
    SELECT id
    FROM roleta_gamificacao
    WHERE user_id = p_user_id
      AND tipo LIKE 'estrela_%'
      AND resgatado = false
    ORDER BY created_at
    LIMIT 5
  )
  UPDATE roleta_gamificacao g
  SET resgatado = true,
      resgatado_at = NOW()
  FROM estrelas_para_resgatar e
  WHERE g.id = e.id;

  GET DIAGNOSTICS v_estrelas_resgatadas = ROW_COUNT;

  -- Criar registro do bônus PIX
  v_resgate_id := gen_random_uuid();

  INSERT INTO roleta_gamificacao (
    id, workspace_id, user_id,
    tipo, valor, resgatado, resgatado_at
  ) VALUES (
    v_resgate_id, p_workspace_id, p_user_id,
    'bonus_pix', 50, false, NULL
  );

  -- Contar estrelas restantes
  SELECT COUNT(*) INTO v_total_estrelas
  FROM roleta_gamificacao
  WHERE user_id = p_user_id
    AND tipo LIKE 'estrela_%'
    AND resgatado = false;

  RETURN QUERY SELECT
    true,
    v_resgate_id,
    'PIX de R$50 solicitado! Será enviado em até 24h.',
    v_total_estrelas;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resgatar_pix IS 'Resgata 5 estrelas por R$50 via PIX';

-- ============================================================================
-- 11. VIEW: Qualificação com progresso
-- ============================================================================

CREATE OR REPLACE VIEW v_roleta_qualificacao_progresso AS
SELECT
  q.id,
  q.workspace_id,
  q.plantao_id,
  q.presenca_id,
  q.user_id,
  u.nome AS user_nome,
  q.total_ofertas,
  p.meta_ofertas,
  q.qualificado,
  q.qualificado_at,
  q.posicao_roleta_leads,
  -- Progresso
  ROUND((q.total_ofertas::DECIMAL / NULLIF(p.meta_ofertas, 0)) * 100, 1) AS progresso_percentual,
  GREATEST(p.meta_ofertas - q.total_ofertas, 0) AS ofertas_faltantes,
  -- Copy motivacional
  CASE
    WHEN q.qualificado THEN 'Você está na Roleta de Leads!'
    WHEN q.total_ofertas >= p.meta_ofertas * 0.9 THEN 'Quase lá! Só mais ' || (p.meta_ofertas - q.total_ofertas) || '!'
    WHEN q.total_ofertas >= p.meta_ofertas * 0.5 THEN 'Metade do caminho! Continue assim.'
    WHEN q.total_ofertas >= p.meta_ofertas * 0.3 THEN 'Bom progresso! Só mais ' || (p.meta_ofertas - q.total_ofertas) || ' ofertas.'
    ELSE 'Comece forte! Cada oferta te aproxima dos leads.'
  END AS mensagem_motivacional
FROM roleta_qualificacao q
JOIN users u ON u.id = q.user_id
JOIN recepcao_plantoes p ON p.id = q.plantao_id;

COMMENT ON VIEW v_roleta_qualificacao_progresso IS 'View de qualificação com progresso e mensagens motivacionais';

-- ============================================================================
-- 12. VIEW: Estrelas do corretor
-- ============================================================================

CREATE OR REPLACE VIEW v_roleta_estrelas AS
SELECT
  user_id,
  workspace_id,
  COUNT(*) FILTER (WHERE tipo LIKE 'estrela_%' AND NOT resgatado) AS estrelas_disponiveis,
  COUNT(*) FILTER (WHERE tipo LIKE 'estrela_%' AND resgatado) AS estrelas_resgatadas,
  COUNT(*) FILTER (WHERE tipo = 'bonus_pix' AND NOT resgatado) AS pix_pendentes,
  COUNT(*) FILTER (WHERE tipo = 'bonus_pix' AND resgatado) AS pix_pagos,
  SUM(CASE WHEN tipo = 'bonus_pix' AND resgatado THEN valor ELSE 0 END) AS total_pix_recebido,
  -- Pode resgatar?
  COUNT(*) FILTER (WHERE tipo LIKE 'estrela_%' AND NOT resgatado) >= 5 AS pode_resgatar
FROM roleta_gamificacao
GROUP BY user_id, workspace_id;

COMMENT ON VIEW v_roleta_estrelas IS 'Resumo de estrelas e resgates por corretor';

-- ============================================================================
-- 13. VIEW: Fila dupla (Portaria + Leads)
-- ============================================================================

CREATE OR REPLACE VIEW v_roleta_fila_dupla AS
SELECT
  p.id AS presenca_id,
  p.plantao_id,
  p.user_id,
  u.nome AS corretor_nome,
  u.telefone AS corretor_telefone,
  u.avatar_url AS corretor_avatar,
  p.status,
  p.checkin_at,
  p.checkin_method,
  p.em_atendimento,
  p.pausado,
  p.feedback_pendente,
  p.leads_ativos,
  p.workspace_id,
  -- Fila da Portaria (sorteio)
  p.sorteio_posicao AS posicao_portaria,
  p.posicao_fila AS posicao_atual_portaria,
  -- Fila de Leads (qualificação)
  q.qualificado,
  q.total_ofertas,
  q.posicao_roleta_leads AS posicao_leads,
  pl.meta_ofertas,
  -- Status para cada fila
  CASE
    WHEN p.em_atendimento THEN 'atendendo'
    WHEN p.pausado THEN 'pausado'
    WHEN p.feedback_pendente THEN 'feedback'
    WHEN p.leads_ativos >= 5 THEN 'limite'
    WHEN p.status != 'presente' THEN 'ausente'
    ELSE 'disponivel'
  END AS status_portaria,
  CASE
    WHEN NOT COALESCE(q.qualificado, false) THEN 'nao_qualificado'
    WHEN p.em_atendimento THEN 'atendendo'
    WHEN p.pausado THEN 'pausado'
    WHEN p.feedback_pendente THEN 'feedback'
    WHEN p.leads_ativos >= 5 THEN 'limite'
    WHEN p.status != 'presente' THEN 'ausente'
    ELSE 'disponivel'
  END AS status_leads
FROM recepcao_presencas p
JOIN users u ON u.id = p.user_id
JOIN recepcao_plantoes pl ON pl.id = p.plantao_id
LEFT JOIN roleta_qualificacao q ON q.presenca_id = p.id
ORDER BY p.sorteio_posicao NULLS LAST, p.posicao_fila;

COMMENT ON VIEW v_roleta_fila_dupla IS 'View unificada das filas de portaria e leads com status';

-- ============================================================================
-- 14. TRIGGER: Adicionar estrela ao agendar visita
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_adicionar_estrela_agendamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o feedback mudou para agendou_visita
  IF NEW.feedback_status = 'agendou_visita'
     AND (OLD.feedback_status IS NULL OR OLD.feedback_status != 'agendou_visita') THEN

    PERFORM adicionar_estrela(
      NEW.workspace_id,
      NEW.user_id,
      NEW.plantao_id,
      'estrela_agendamento',
      NEW.id,
      'atribuicao'
    );
  END IF;

  -- Se o feedback mudou para fechou_negocio (2 estrelas)
  IF NEW.feedback_status = 'fechou_negocio'
     AND (OLD.feedback_status IS NULL OR OLD.feedback_status != 'fechou_negocio') THEN

    -- Primeira estrela
    PERFORM adicionar_estrela(
      NEW.workspace_id,
      NEW.user_id,
      NEW.plantao_id,
      'estrela_fechamento',
      NEW.id,
      'atribuicao'
    );
    -- Segunda estrela
    PERFORM adicionar_estrela(
      NEW.workspace_id,
      NEW.user_id,
      NEW.plantao_id,
      'estrela_fechamento',
      NEW.id,
      'atribuicao'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_estrela_agendamento ON recepcao_atribuicoes;
CREATE TRIGGER trigger_estrela_agendamento
  AFTER UPDATE OF feedback_status ON recepcao_atribuicoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_adicionar_estrela_agendamento();

COMMENT ON TRIGGER trigger_estrela_agendamento ON recepcao_atribuicoes IS 'Adiciona estrela automaticamente ao agendar visita ou fechar negócio';

-- ============================================================================
-- 15. ÍNDICES ADICIONAIS
-- ============================================================================

-- Índice para buscar ofertas do dia
CREATE INDEX IF NOT EXISTS idx_roleta_ofertas_dia
ON roleta_ofertas(plantao_id, user_id, created_at);

-- Índice para ranking de estrelas
CREATE INDEX IF NOT EXISTS idx_roleta_gamificacao_ranking
ON roleta_gamificacao(workspace_id, created_at)
WHERE tipo LIKE 'estrela_%' AND resgatado = false;

-- ============================================================================
-- 16. COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON TABLE roleta_ofertas IS 'Registro de ofertas/ligações para qualificação na roleta de leads';
COMMENT ON TABLE roleta_qualificacao IS 'Status de qualificação dos corretores para a roleta de leads externos';
COMMENT ON TABLE roleta_gamificacao IS 'Sistema de gamificação com estrelas e recompensas PIX';

COMMIT;
