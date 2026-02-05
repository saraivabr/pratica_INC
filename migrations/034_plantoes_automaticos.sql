-- =============================================================================
-- Migration 034: Plantões Automáticos (Recorrentes)
-- Sistema para criar plantões automaticamente baseado em templates semanais
-- Data: 2026-02-04
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. TABELA: recepcao_plantoes_recorrentes
-- Templates de plantões que se repetem semanalmente
-- ============================================================================

CREATE TABLE IF NOT EXISTS recepcao_plantoes_recorrentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES recepcao_locais(id) ON DELETE CASCADE,

  -- Nome para identificação
  nome VARCHAR(100) NOT NULL,

  -- Dias da semana (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab, 7=Dom)
  dias_semana INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],

  -- Horário
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  hora_limite_checkin TIME,

  -- Configurações do plantão
  max_corretores INTEGER,
  meta_ofertas INTEGER DEFAULT 30,
  descricao TEXT,

  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: horário válido
  CONSTRAINT check_hora_fim_maior CHECK (hora_fim > hora_inicio)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plantoes_recorrentes_workspace
ON recepcao_plantoes_recorrentes(workspace_id);

CREATE INDEX IF NOT EXISTS idx_plantoes_recorrentes_local
ON recepcao_plantoes_recorrentes(local_id);

CREATE INDEX IF NOT EXISTS idx_plantoes_recorrentes_active
ON recepcao_plantoes_recorrentes(workspace_id, is_active)
WHERE is_active = true;

COMMENT ON TABLE recepcao_plantoes_recorrentes IS 'Templates de plantões recorrentes para criação automática';
COMMENT ON COLUMN recepcao_plantoes_recorrentes.dias_semana IS 'Array de dias: 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab, 7=Dom';
COMMENT ON COLUMN recepcao_plantoes_recorrentes.is_active IS 'Se está ativo para criação automática';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_plantoes_recorrentes_updated_at ON recepcao_plantoes_recorrentes;
CREATE TRIGGER update_plantoes_recorrentes_updated_at
  BEFORE UPDATE ON recepcao_plantoes_recorrentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. TABELA: recepcao_plantoes_criados_auto
-- Log de plantões criados automaticamente (para evitar duplicatas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS recepcao_plantoes_criados_auto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorrente_id UUID NOT NULL REFERENCES recepcao_plantoes_recorrentes(id) ON DELETE CASCADE,
  plantao_id UUID NOT NULL REFERENCES recepcao_plantoes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Uma criação por template por dia
  UNIQUE(recorrente_id, data)
);

CREATE INDEX IF NOT EXISTS idx_plantoes_criados_auto_recorrente
ON recepcao_plantoes_criados_auto(recorrente_id);

CREATE INDEX IF NOT EXISTS idx_plantoes_criados_auto_data
ON recepcao_plantoes_criados_auto(data);

COMMENT ON TABLE recepcao_plantoes_criados_auto IS 'Log de plantões criados automaticamente';

-- ============================================================================
-- 3. FUNÇÃO: criar_plantoes_automaticos
-- Cria plantões para hoje baseado nos templates ativos
-- ============================================================================

CREATE OR REPLACE FUNCTION criar_plantoes_automaticos(p_data DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  plantao_id UUID,
  recorrente_id UUID,
  local_nome VARCHAR,
  sucesso BOOLEAN,
  mensagem TEXT
) AS $$
DECLARE
  v_recorrente RECORD;
  v_dia_semana INTEGER;
  v_plantao_id UUID;
  v_local_nome VARCHAR;
BEGIN
  -- Obter dia da semana (1=Seg, 7=Dom)
  -- PostgreSQL: EXTRACT(ISODOW) retorna 1=Seg, 7=Dom
  v_dia_semana := EXTRACT(ISODOW FROM p_data)::INTEGER;

  -- Iterar sobre templates ativos
  FOR v_recorrente IN
    SELECT
      r.*,
      l.nome AS local_nome
    FROM recepcao_plantoes_recorrentes r
    JOIN recepcao_locais l ON l.id = r.local_id
    WHERE r.is_active = true
      AND l.is_active = true
      AND v_dia_semana = ANY(r.dias_semana)
  LOOP
    v_local_nome := v_recorrente.local_nome;

    -- Verificar se já foi criado hoje
    IF EXISTS (
      SELECT 1 FROM recepcao_plantoes_criados_auto
      WHERE recorrente_id = v_recorrente.id AND data = p_data
    ) THEN
      RETURN QUERY SELECT
        NULL::UUID,
        v_recorrente.id,
        v_local_nome,
        false,
        'Plantão já criado para esta data'::TEXT;
      CONTINUE;
    END IF;

    -- Verificar se já existe plantão manual para mesmo local/data/horário
    IF EXISTS (
      SELECT 1 FROM recepcao_plantoes
      WHERE local_id = v_recorrente.local_id
        AND data = p_data
        AND hora_inicio = v_recorrente.hora_inicio
        AND hora_fim = v_recorrente.hora_fim
        AND status = 'ativo'
    ) THEN
      RETURN QUERY SELECT
        NULL::UUID,
        v_recorrente.id,
        v_local_nome,
        false,
        'Já existe plantão manual para este horário'::TEXT;
      CONTINUE;
    END IF;

    -- Criar o plantão
    INSERT INTO recepcao_plantoes (
      workspace_id,
      local_id,
      data,
      hora_inicio,
      hora_fim,
      hora_limite_checkin,
      max_corretores,
      meta_ofertas,
      descricao
    ) VALUES (
      v_recorrente.workspace_id,
      v_recorrente.local_id,
      p_data,
      v_recorrente.hora_inicio,
      v_recorrente.hora_fim,
      v_recorrente.hora_limite_checkin,
      v_recorrente.max_corretores,
      v_recorrente.meta_ofertas,
      COALESCE(v_recorrente.descricao, 'Plantão automático: ' || v_recorrente.nome)
    )
    RETURNING id INTO v_plantao_id;

    -- Registrar criação
    INSERT INTO recepcao_plantoes_criados_auto (recorrente_id, plantao_id, data)
    VALUES (v_recorrente.id, v_plantao_id, p_data);

    RETURN QUERY SELECT
      v_plantao_id,
      v_recorrente.id,
      v_local_nome,
      true,
      'Plantão criado com sucesso'::TEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION criar_plantoes_automaticos IS 'Cria plantões automaticamente baseado nos templates recorrentes ativos';

-- ============================================================================
-- 4. TABELA: recepcao_feriados (opcional)
-- Para evitar criar plantões em feriados
-- ============================================================================

CREATE TABLE IF NOT EXISTS recepcao_feriados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  nacional BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Feriados nacionais (workspace_id = NULL) ou específicos do workspace
  UNIQUE(workspace_id, data)
);

CREATE INDEX IF NOT EXISTS idx_feriados_data ON recepcao_feriados(data);

COMMENT ON TABLE recepcao_feriados IS 'Feriados para pular na criação automática de plantões';

-- Inserir feriados nacionais de 2026
INSERT INTO recepcao_feriados (workspace_id, data, nome, nacional) VALUES
  (NULL, '2026-01-01', 'Confraternização Universal', true),
  (NULL, '2026-02-16', 'Carnaval', true),
  (NULL, '2026-02-17', 'Carnaval', true),
  (NULL, '2026-04-03', 'Sexta-feira Santa', true),
  (NULL, '2026-04-21', 'Tiradentes', true),
  (NULL, '2026-05-01', 'Dia do Trabalho', true),
  (NULL, '2026-06-04', 'Corpus Christi', true),
  (NULL, '2026-09-07', 'Independência', true),
  (NULL, '2026-10-12', 'Nossa Senhora Aparecida', true),
  (NULL, '2026-11-02', 'Finados', true),
  (NULL, '2026-11-15', 'Proclamação da República', true),
  (NULL, '2026-12-25', 'Natal', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. FUNÇÃO: criar_plantoes_automaticos_com_feriados
-- Versão que respeita feriados
-- ============================================================================

CREATE OR REPLACE FUNCTION criar_plantoes_dia(
  p_data DATE DEFAULT CURRENT_DATE,
  p_respeitar_feriados BOOLEAN DEFAULT true
)
RETURNS TABLE (
  plantao_id UUID,
  recorrente_id UUID,
  local_nome VARCHAR,
  sucesso BOOLEAN,
  mensagem TEXT
) AS $$
BEGIN
  -- Verificar se é feriado
  IF p_respeitar_feriados AND EXISTS (
    SELECT 1 FROM recepcao_feriados
    WHERE data = p_data
  ) THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::UUID,
      'N/A'::VARCHAR,
      false,
      'Data é feriado: ' || (SELECT nome FROM recepcao_feriados WHERE data = p_data LIMIT 1);
    RETURN;
  END IF;

  -- Delegar para função principal
  RETURN QUERY SELECT * FROM criar_plantoes_automaticos(p_data);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION criar_plantoes_dia IS 'Cria plantões do dia respeitando feriados';

-- ============================================================================
-- 6. VIEW: Resumo de plantões recorrentes
-- ============================================================================

CREATE OR REPLACE VIEW v_plantoes_recorrentes AS
SELECT
  r.id,
  r.workspace_id,
  r.local_id,
  l.nome AS local_nome,
  l.endereco AS local_endereco,
  r.nome,
  r.dias_semana,
  r.hora_inicio,
  r.hora_fim,
  r.hora_limite_checkin,
  r.max_corretores,
  r.meta_ofertas,
  r.descricao,
  r.is_active,
  r.created_at,
  -- Formatação amigável dos dias
  ARRAY(
    SELECT CASE d
      WHEN 1 THEN 'Seg'
      WHEN 2 THEN 'Ter'
      WHEN 3 THEN 'Qua'
      WHEN 4 THEN 'Qui'
      WHEN 5 THEN 'Sex'
      WHEN 6 THEN 'Sab'
      WHEN 7 THEN 'Dom'
    END
    FROM UNNEST(r.dias_semana) AS d
    ORDER BY d
  ) AS dias_semana_texto,
  -- Contagem de plantões criados
  (SELECT COUNT(*) FROM recepcao_plantoes_criados_auto ca WHERE ca.recorrente_id = r.id) AS total_plantoes_criados,
  -- Último plantão criado
  (SELECT MAX(data) FROM recepcao_plantoes_criados_auto ca WHERE ca.recorrente_id = r.id) AS ultimo_plantao_criado
FROM recepcao_plantoes_recorrentes r
JOIN recepcao_locais l ON l.id = r.local_id;

COMMENT ON VIEW v_plantoes_recorrentes IS 'View com dados dos templates recorrentes e estatísticas';

COMMIT;
