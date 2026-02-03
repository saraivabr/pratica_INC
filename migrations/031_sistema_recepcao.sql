-- =============================================================================
-- Migration 031: Sistema de Recepção
-- Controle de presença de corretores no plantão e distribuição de leads (roleta)
-- Data: 2026-02-03
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. TABELA: recepcao_locais
-- Stands/locais com coordenadas GPS e QR Code para check-in
-- ============================================================================

CREATE TABLE IF NOT EXISTS recepcao_locais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Dados do local
  nome VARCHAR(255) NOT NULL,
  endereco TEXT,
  descricao TEXT,

  -- Geolocalização para check-in por GPS
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  raio_geofence INTEGER DEFAULT 100, -- raio em metros para validar presença

  -- QR Code para check-in
  qr_code_token UUID DEFAULT gen_random_uuid() UNIQUE,

  -- Configurações
  is_active BOOLEAN DEFAULT true,

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recepcao_locais_workspace ON recepcao_locais(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_locais_qr_token ON recepcao_locais(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_recepcao_locais_active ON recepcao_locais(workspace_id, is_active);

-- ============================================================================
-- 2. TABELA: recepcao_plantoes
-- Turnos agendados por local/data
-- ============================================================================

CREATE TABLE IF NOT EXISTS recepcao_plantoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES recepcao_locais(id) ON DELETE CASCADE,

  -- Período do plantão
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,

  -- Configurações
  max_corretores INTEGER, -- máximo de corretores no plantão (null = ilimitado)
  descricao TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'ativo', -- ativo, cancelado, encerrado

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recepcao_plantoes_workspace ON recepcao_plantoes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_plantoes_local ON recepcao_plantoes(local_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_plantoes_data ON recepcao_plantoes(data);
CREATE INDEX IF NOT EXISTS idx_recepcao_plantoes_workspace_data ON recepcao_plantoes(workspace_id, data);
CREATE INDEX IF NOT EXISTS idx_recepcao_plantoes_status ON recepcao_plantoes(status);

-- Constraint: impedir sobreposição de plantões no mesmo local
CREATE UNIQUE INDEX IF NOT EXISTS idx_recepcao_plantoes_unique_turno
  ON recepcao_plantoes(local_id, data, hora_inicio)
  WHERE status = 'ativo';

-- ============================================================================
-- 3. TABELA: recepcao_presencas
-- Check-in/out dos corretores + posição na fila
-- ============================================================================

CREATE TABLE IF NOT EXISTS recepcao_presencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plantao_id UUID NOT NULL REFERENCES recepcao_plantoes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Status da presença
  status VARCHAR(20) NOT NULL DEFAULT 'presente', -- presente, ausente, saiu

  -- Check-in
  checkin_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  checkin_method VARCHAR(20) NOT NULL DEFAULT 'manual', -- gps, qr_code, manual, botao
  checkin_latitude DECIMAL(10, 8),
  checkin_longitude DECIMAL(11, 8),

  -- Check-out
  checkout_at TIMESTAMP WITH TIME ZONE,

  -- Posição na fila (roleta)
  posicao_fila INTEGER NOT NULL,

  -- Flags de controle da fila
  em_atendimento BOOLEAN DEFAULT false,
  pausado BOOLEAN DEFAULT false,
  feedback_pendente BOOLEAN DEFAULT false,

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recepcao_presencas_workspace ON recepcao_presencas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_presencas_plantao ON recepcao_presencas(plantao_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_presencas_user ON recepcao_presencas(user_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_presencas_status ON recepcao_presencas(status);
CREATE INDEX IF NOT EXISTS idx_recepcao_presencas_plantao_status ON recepcao_presencas(plantao_id, status);
CREATE INDEX IF NOT EXISTS idx_recepcao_presencas_fila ON recepcao_presencas(plantao_id, posicao_fila)
  WHERE status = 'presente' AND em_atendimento = false AND pausado = false AND feedback_pendente = false;

-- Constraint: um corretor só pode ter uma presença ativa por plantão
CREATE UNIQUE INDEX IF NOT EXISTS idx_recepcao_presencas_unique_ativa
  ON recepcao_presencas(plantao_id, user_id)
  WHERE status = 'presente';

-- ============================================================================
-- 4. TABELA: recepcao_atribuicoes
-- Leads distribuídos + feedback obrigatório
-- ============================================================================

CREATE TABLE IF NOT EXISTS recepcao_atribuicoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plantao_id UUID NOT NULL REFERENCES recepcao_plantoes(id) ON DELETE CASCADE,
  presenca_id UUID NOT NULL REFERENCES recepcao_presencas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Dados do lead/cliente
  lead_nome VARCHAR(255),
  lead_telefone VARCHAR(50),
  lead_email VARCHAR(255),
  lead_origem VARCHAR(30) NOT NULL DEFAULT 'presencial', -- presencial, telefone, whatsapp
  lead_observacoes TEXT,

  -- Referência ao lead no CRM (se existir)
  cvcrm_lead_id INTEGER,
  local_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Atendimento
  atribuido_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  atendimento_iniciado_at TIMESTAMP WITH TIME ZONE,
  atendimento_finalizado_at TIMESTAMP WITH TIME ZONE,

  -- Feedback (obrigatório para liberar próximo lead)
  feedback_status VARCHAR(30), -- interessado, sem_interesse, agendou_visita, fechou_negocio, nao_compareceu, outro
  feedback_observacoes TEXT,
  feedback_at TIMESTAMP WITH TIME ZONE,

  -- Atribuído por (recepcionista)
  atribuido_por UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recepcao_atribuicoes_workspace ON recepcao_atribuicoes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_atribuicoes_plantao ON recepcao_atribuicoes(plantao_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_atribuicoes_presenca ON recepcao_atribuicoes(presenca_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_atribuicoes_user ON recepcao_atribuicoes(user_id);
CREATE INDEX IF NOT EXISTS idx_recepcao_atribuicoes_origem ON recepcao_atribuicoes(lead_origem);
CREATE INDEX IF NOT EXISTS idx_recepcao_atribuicoes_feedback ON recepcao_atribuicoes(feedback_status);
CREATE INDEX IF NOT EXISTS idx_recepcao_atribuicoes_pendente ON recepcao_atribuicoes(presenca_id)
  WHERE feedback_status IS NULL;

-- ============================================================================
-- 5. FUNÇÃO: dentro_geofence
-- Valida se coordenadas estão dentro do raio do local
-- ============================================================================

CREATE OR REPLACE FUNCTION dentro_geofence(
  p_lat1 DECIMAL,
  p_lon1 DECIMAL,
  p_lat2 DECIMAL,
  p_lon2 DECIMAL,
  p_raio_metros INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_distancia DECIMAL;
BEGIN
  -- Calcular distância usando fórmula de Haversine simplificada
  -- Aproximação para distâncias curtas (precisa para raios < 50km)
  v_distancia := 111320 * SQRT(
    POW(p_lat1 - p_lat2, 2) +
    POW((p_lon1 - p_lon2) * COS(RADIANS((p_lat1 + p_lat2) / 2)), 2)
  );

  RETURN v_distancia <= p_raio_metros;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION dentro_geofence IS 'Verifica se um ponto está dentro do raio de outro (geofence)';

-- ============================================================================
-- 6. FUNÇÃO: get_proximo_corretor_fila
-- Retorna próximo corretor disponível na fila
-- ============================================================================

CREATE OR REPLACE FUNCTION get_proximo_corretor_fila(p_plantao_id UUID)
RETURNS TABLE (
  presenca_id UUID,
  user_id UUID,
  user_nome VARCHAR,
  user_telefone VARCHAR,
  posicao_fila INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS presenca_id,
    p.user_id,
    u.nome::VARCHAR AS user_nome,
    u.telefone::VARCHAR AS user_telefone,
    p.posicao_fila
  FROM recepcao_presencas p
  JOIN users u ON u.id = p.user_id
  WHERE p.plantao_id = p_plantao_id
    AND p.status = 'presente'
    AND p.em_atendimento = false
    AND p.pausado = false
    AND p.feedback_pendente = false
  ORDER BY p.posicao_fila ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_proximo_corretor_fila IS 'Retorna o próximo corretor disponível na fila do plantão';

-- ============================================================================
-- 7. FUNÇÃO: mover_corretor_fim_fila
-- Move corretor para fim da fila após receber lead
-- ============================================================================

CREATE OR REPLACE FUNCTION mover_corretor_fim_fila(p_presenca_id UUID)
RETURNS VOID AS $$
DECLARE
  v_plantao_id UUID;
  v_max_posicao INTEGER;
BEGIN
  -- Obter plantao_id da presença
  SELECT plantao_id INTO v_plantao_id
  FROM recepcao_presencas
  WHERE id = p_presenca_id;

  IF v_plantao_id IS NULL THEN
    RAISE EXCEPTION 'Presença não encontrada: %', p_presenca_id;
  END IF;

  -- Obter maior posição atual
  SELECT COALESCE(MAX(posicao_fila), 0) INTO v_max_posicao
  FROM recepcao_presencas
  WHERE plantao_id = v_plantao_id
    AND status = 'presente';

  -- Mover corretor para o fim
  UPDATE recepcao_presencas
  SET posicao_fila = v_max_posicao + 1,
      updated_at = NOW()
  WHERE id = p_presenca_id;

  -- Renumerar fila para evitar gaps
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

COMMENT ON FUNCTION mover_corretor_fim_fila IS 'Move corretor para o fim da fila e renumera as posições';

-- ============================================================================
-- 8. FUNÇÃO: get_proxima_posicao_fila
-- Retorna próxima posição disponível na fila
-- ============================================================================

CREATE OR REPLACE FUNCTION get_proxima_posicao_fila(p_plantao_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_max_posicao INTEGER;
BEGIN
  SELECT COALESCE(MAX(posicao_fila), 0) + 1 INTO v_max_posicao
  FROM recepcao_presencas
  WHERE plantao_id = p_plantao_id
    AND status = 'presente';

  RETURN v_max_posicao;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_proxima_posicao_fila IS 'Retorna a próxima posição disponível na fila';

-- ============================================================================
-- 9. TRIGGER: updated_at automático
-- ============================================================================

-- Trigger para recepcao_locais
DROP TRIGGER IF EXISTS update_recepcao_locais_updated_at ON recepcao_locais;
CREATE TRIGGER update_recepcao_locais_updated_at
  BEFORE UPDATE ON recepcao_locais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para recepcao_plantoes
DROP TRIGGER IF EXISTS update_recepcao_plantoes_updated_at ON recepcao_plantoes;
CREATE TRIGGER update_recepcao_plantoes_updated_at
  BEFORE UPDATE ON recepcao_plantoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para recepcao_presencas
DROP TRIGGER IF EXISTS update_recepcao_presencas_updated_at ON recepcao_presencas;
CREATE TRIGGER update_recepcao_presencas_updated_at
  BEFORE UPDATE ON recepcao_presencas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para recepcao_atribuicoes
DROP TRIGGER IF EXISTS update_recepcao_atribuicoes_updated_at ON recepcao_atribuicoes;
CREATE TRIGGER update_recepcao_atribuicoes_updated_at
  BEFORE UPDATE ON recepcao_atribuicoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. HIERARQUIA: Adicionar papel "recepcionista"
-- ============================================================================

-- Inserir nova hierarquia se não existir
INSERT INTO hierarquias (slug, nome, nivel, descricao)
VALUES ('recepcionista', 'Recepcionista', 4, 'Controle de presença e distribuição de leads no plantão')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 11. FEATURE: Adicionar feature "recepcao"
-- ============================================================================

-- Inserir nova feature se não existir
INSERT INTO features (slug, nome, descricao, icone, rota_base)
VALUES ('recepcao', 'Recepção', 'Sistema de controle de presença e roleta de leads no plantão', 'Users', '/admin/recepcao')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 12. PERMISSÕES: Configurar acesso à feature recepcao
-- ============================================================================

-- Master: acesso total
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, true
FROM hierarquias h, features f
WHERE h.slug = 'master' AND f.slug = 'recepcao'
ON CONFLICT DO NOTHING;

-- Diretor: acesso total
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, true
FROM hierarquias h, features f
WHERE h.slug = 'diretor' AND f.slug = 'recepcao'
ON CONFLICT DO NOTHING;

-- Gerente: acesso total
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, true
FROM hierarquias h, features f
WHERE h.slug = 'gerente' AND f.slug = 'recepcao'
ON CONFLICT DO NOTHING;

-- Recepcionista: acesso total
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, true
FROM hierarquias h, features f
WHERE h.slug = 'recepcionista' AND f.slug = 'recepcao'
ON CONFLICT DO NOTHING;

-- Corretor: sem acesso admin, apenas check-in próprio (via rota /corretor/recepcao)
INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
SELECT h.id, f.id, false
FROM hierarquias h, features f
WHERE h.slug = 'corretor' AND f.slug = 'recepcao'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 13. VIEW: Fila do plantão em tempo real
-- ============================================================================

CREATE OR REPLACE VIEW v_recepcao_fila AS
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
  p.workspace_id,
  -- Status legível
  CASE
    WHEN p.em_atendimento THEN 'Em atendimento'
    WHEN p.pausado THEN 'Pausado'
    WHEN p.feedback_pendente THEN 'Aguardando feedback'
    WHEN p.status != 'presente' THEN 'Ausente'
    ELSE 'Disponível'
  END AS status_legivel,
  -- Pode receber lead?
  (p.status = 'presente' AND NOT p.em_atendimento AND NOT p.pausado AND NOT p.feedback_pendente) AS disponivel
FROM recepcao_presencas p
JOIN users u ON u.id = p.user_id
ORDER BY p.posicao_fila;

COMMENT ON VIEW v_recepcao_fila IS 'View da fila de corretores no plantão com status em tempo real';

-- ============================================================================
-- 14. VIEW: Dashboard de estatísticas do plantão
-- ============================================================================

CREATE OR REPLACE VIEW v_recepcao_stats AS
SELECT
  pl.id AS plantao_id,
  pl.workspace_id,
  pl.data,
  l.nome AS local_nome,
  -- Contagens
  COUNT(DISTINCT CASE WHEN p.status = 'presente' THEN p.id END) AS total_presentes,
  COUNT(DISTINCT CASE WHEN p.status = 'presente' AND NOT p.em_atendimento AND NOT p.pausado AND NOT p.feedback_pendente THEN p.id END) AS disponiveis,
  COUNT(DISTINCT CASE WHEN p.em_atendimento THEN p.id END) AS em_atendimento,
  COUNT(DISTINCT CASE WHEN p.pausado THEN p.id END) AS pausados,
  COUNT(DISTINCT CASE WHEN p.feedback_pendente THEN p.id END) AS aguardando_feedback,
  -- Atribuições
  COUNT(DISTINCT a.id) AS total_atribuicoes,
  COUNT(DISTINCT CASE WHEN a.feedback_status IS NOT NULL THEN a.id END) AS atribuicoes_com_feedback,
  COUNT(DISTINCT CASE WHEN a.feedback_status = 'interessado' THEN a.id END) AS interessados,
  COUNT(DISTINCT CASE WHEN a.feedback_status = 'agendou_visita' THEN a.id END) AS agendaram_visita,
  COUNT(DISTINCT CASE WHEN a.feedback_status = 'fechou_negocio' THEN a.id END) AS fecharam_negocio
FROM recepcao_plantoes pl
JOIN recepcao_locais l ON l.id = pl.local_id
LEFT JOIN recepcao_presencas p ON p.plantao_id = pl.id
LEFT JOIN recepcao_atribuicoes a ON a.plantao_id = pl.id
GROUP BY pl.id, pl.workspace_id, pl.data, l.nome;

COMMENT ON VIEW v_recepcao_stats IS 'Estatísticas agregadas do plantão';

-- ============================================================================
-- 15. COMENTÁRIOS NAS TABELAS
-- ============================================================================

COMMENT ON TABLE recepcao_locais IS 'Stands/locais de plantão com coordenadas GPS para check-in';
COMMENT ON TABLE recepcao_plantoes IS 'Turnos agendados por local e data';
COMMENT ON TABLE recepcao_presencas IS 'Registro de presença dos corretores no plantão (fila)';
COMMENT ON TABLE recepcao_atribuicoes IS 'Leads distribuídos aos corretores com feedback obrigatório';

COMMENT ON COLUMN recepcao_locais.raio_geofence IS 'Raio em metros para validar check-in por GPS';
COMMENT ON COLUMN recepcao_locais.qr_code_token IS 'Token único para validar check-in por QR Code';

COMMENT ON COLUMN recepcao_presencas.checkin_method IS 'Método de check-in: gps, qr_code, manual, botao';
COMMENT ON COLUMN recepcao_presencas.posicao_fila IS 'Posição do corretor na fila (roleta)';
COMMENT ON COLUMN recepcao_presencas.em_atendimento IS 'Corretor está atendendo um lead';
COMMENT ON COLUMN recepcao_presencas.pausado IS 'Corretor está pausado na fila';
COMMENT ON COLUMN recepcao_presencas.feedback_pendente IS 'Corretor tem feedback pendente (bloqueado)';

COMMENT ON COLUMN recepcao_atribuicoes.lead_origem IS 'Origem do lead: presencial, telefone, whatsapp';
COMMENT ON COLUMN recepcao_atribuicoes.feedback_status IS 'Status do feedback: interessado, sem_interesse, agendou_visita, fechou_negocio, nao_compareceu, outro';

COMMIT;
