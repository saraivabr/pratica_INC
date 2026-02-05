-- Migration 044: Normalizar Empreendimentos de Leads
-- Objetivo: Mover array de empreendimentos de JSONB para tabela normalizada
-- Impacto: 1 nova tabela, melhor performance, queries normalizadas
-- Duração estimada: 1-2 minutos

-- ============================================================================
-- PASSO 1: Criar tabela de relacionamento lead_empreendimentos
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_empreendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id INTEGER NOT NULL REFERENCES cvcrm_leads(idlead) ON DELETE CASCADE,
  empreendimento_id INTEGER NOT NULL REFERENCES cvcrm_empreendimentos(cvcrm_id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uk_lead_empreendimentos UNIQUE(lead_id, empreendimento_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_empreendimentos_lead ON lead_empreendimentos(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_empreendimentos_empreendimento ON lead_empreendimentos(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_lead_empreendimentos_workspace ON lead_empreendimentos(workspace_id);

COMMENT ON TABLE lead_empreendimentos IS 'Relacionamento many-to-many: lead está interessado em quais empreendimentos';

-- ============================================================================
-- PASSO 2: Migrar dados de JSONB → tabela normalizada
-- ============================================================================

-- Inserir relacionamentos lead_empreendimentos
INSERT INTO lead_empreendimentos (lead_id, empreendimento_id, workspace_id)
SELECT
  l.idlead,
  (jsonb_object_keys(emp) = 'id' OR (emp->>'id')::INTEGER)::INTEGER as emp_id,
  l.workspace_id
FROM cvcrm_leads l
CROSS JOIN jsonb_array_elements(l.empreendimento) as emp
WHERE l.empreendimento IS NOT NULL
  AND jsonb_array_length(l.empreendimento) > 0
  AND (emp->>'id')::INTEGER IS NOT NULL
ON CONFLICT (lead_id, empreendimento_id) DO NOTHING;

-- Alternativa se a estrutura JSONB for simples:
INSERT INTO lead_empreendimentos (lead_id, empreendimento_id, workspace_id)
SELECT
  l.idlead,
  (elem->>'id')::INTEGER,
  l.workspace_id
FROM cvcrm_leads l
CROSS JOIN jsonb_array_elements(l.empreendimento) as elem
WHERE l.empreendimento IS NOT NULL
  AND jsonb_array_length(l.empreendimento) > 0
  AND (elem->>'id')::INTEGER IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM cvcrm_empreendimentos
    WHERE cvcrm_id = (elem->>'id')::INTEGER
  )
ON CONFLICT (lead_id, empreendimento_id) DO NOTHING;

-- ============================================================================
-- PASSO 3: Validar migração
-- ============================================================================

-- Contar relacionamentos migrados
SELECT COUNT(*) as total_lead_empreendimentos FROM lead_empreendimentos;

-- Verificar que não há empreendimentos inválidos
SELECT COUNT(*) as invalid_empreendimentos
FROM lead_empreendimentos le
WHERE NOT EXISTS (
  SELECT 1 FROM cvcrm_empreendimentos
  WHERE cvcrm_id = le.empreendimento_id
);

-- Esperado: 0 (nenhum empreendimento inválido)

-- Verificar leads com múltiplos empreendimentos
SELECT
  le.lead_id,
  COUNT(DISTINCT le.empreendimento_id) as total_empreendimentos,
  STRING_AGG(ce.nome, ', ') as nomes
FROM lead_empreendimentos le
JOIN cvcrm_empreendimentos ce ON ce.cvcrm_id = le.empreendimento_id
GROUP BY le.lead_id
HAVING COUNT(DISTINCT le.empreendimento_id) > 1
LIMIT 10;

-- ============================================================================
-- PASSO 4: Remover coluna JSONB antiga (comentada por segurança)
-- ============================================================================

-- Descomente após validar migração manualmente:
-- ALTER TABLE cvcrm_leads DROP COLUMN empreendimento;

-- ============================================================================
-- PASSO 5: Criar view de compatibilidade (transitório)
-- ============================================================================

-- Esta view permite queries antigas continuarem funcionando:
CREATE OR REPLACE VIEW vw_lead_empreendimento_legacy AS
SELECT
  l.idlead as lead_id,
  jsonb_agg(
    jsonb_build_object(
      'id', ce.cvcrm_id,
      'nome', ce.nome
    )
  ) as empreendimento
FROM cvcrm_leads l
LEFT JOIN lead_empreendimentos le ON le.lead_id = l.idlead
LEFT JOIN cvcrm_empreendimentos ce ON ce.cvcrm_id = le.empreendimento_id
WHERE l.empreendimento IS NULL OR jsonb_array_length(l.empreendimento) = 0
GROUP BY l.idlead;

COMMENT ON VIEW vw_lead_empreendimento_legacy IS 'View de compatibilidade com código legado que usa JSONB';

-- ============================================================================
-- Notas de Execução
-- ============================================================================
/*
VALIDAR ANTES DE REMOVER COLUNA JSONB:

1. Verificar que todos os empreendimentos foram migrados:
   SELECT COUNT(*) as total_migrations FROM lead_empreendimentos;

2. Confirmar integridade referencial:
   SELECT COUNT(*) as orphan_records
   FROM lead_empreendimentos le
   WHERE NOT EXISTS (
     SELECT 1 FROM cvcrm_empreendimentos
     WHERE cvcrm_id = le.empreendimento_id
   );
   (Deve ser 0)

3. Testar que aplicação funciona com nova estrutura:
   - Listar leads por empreendimento
   - Filtrar leads com interesse em múltiplos empreendimentos
   - Deletar empreendimento (deve remover relacionamentos)

4. Após validação, executar:
   ALTER TABLE cvcrm_leads DROP COLUMN empreendimento;
   DROP VIEW vw_lead_empreendimento_legacy;

ROLLBACK:
  Se necessário, restaurar coluna:
  ALTER TABLE cvcrm_leads ADD COLUMN empreendimento JSONB;

  Repopular com dados:
  UPDATE cvcrm_leads l
  SET empreendimento = (
    SELECT jsonb_agg(
      jsonb_build_object('id', ce.cvcrm_id, 'nome', ce.nome)
    )
    FROM lead_empreendimentos le
    JOIN cvcrm_empreendimentos ce ON ce.cvcrm_id = le.empreendimento_id
    WHERE le.lead_id = l.idlead
  );

QUERY PATTERNS (ANTES vs DEPOIS):

ANTES (JSONB):
  SELECT * FROM cvcrm_leads
  WHERE empreendimento @> '[{"id": 123}]';

DEPOIS (Normalizado):
  SELECT DISTINCT l.*
  FROM cvcrm_leads l
  JOIN lead_empreendimentos le ON le.lead_id = l.idlead
  WHERE le.empreendimento_id = 123;

PERFORMANCE IMPROVEMENT:
  - JSONB contains: O(n) array scan
  - FK join: O(1) index lookup
  - Speedup: ~10-100x em databases grandes
*/
