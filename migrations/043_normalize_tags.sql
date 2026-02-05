-- Migration 043: Normalizar Tags
-- Objetivo: Mover tags de JSONB para tabela normalizada
-- Impacto: 2 novas tabelas, migração de dados, melhor performance
-- Duração estimada: 1-2 minutos

-- ============================================================================
-- PASSO 1: Criar tabela de tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7), -- Cor em hex (#RRGGBB)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uk_tags_workspace_name UNIQUE(workspace_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_workspace ON tags(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

COMMENT ON TABLE tags IS 'Tags globais do sistema, reutilizáveis em múltiplas entidades';
COMMENT ON COLUMN tags.name IS 'Nome da tag (ex: "cliente_qualificado", "reativado")';
COMMENT ON COLUMN tags.color IS 'Cor da tag para UI (hex format: #RRGGBB)';

-- ============================================================================
-- PASSO 2: Criar tabela de relacionamento lead_tags
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id INTEGER NOT NULL REFERENCES cvcrm_leads(idlead) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT uk_lead_tags_lead_tag UNIQUE(lead_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag ON lead_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_workspace ON lead_tags(workspace_id);

COMMENT ON TABLE lead_tags IS 'Relacionamento many-to-many entre leads e tags';

-- ============================================================================
-- PASSO 3: Migrar dados de JSONB → tabelas normalizadas
-- ============================================================================

-- Inserir tags únicas de todos os leads
INSERT INTO tags (workspace_id, name)
SELECT DISTINCT
  l.workspace_id,
  jsonb_array_elements_text(l.tags) as tag_name
FROM cvcrm_leads l
WHERE l.tags IS NOT NULL
  AND jsonb_array_length(l.tags) > 0
ON CONFLICT (workspace_id, name) DO NOTHING;

-- Inserir relacionamentos lead_tags
INSERT INTO lead_tags (lead_id, tag_id, workspace_id)
SELECT
  l.idlead,
  t.id,
  l.workspace_id
FROM cvcrm_leads l
CROSS JOIN jsonb_array_elements_text(l.tags) as tag_name
JOIN tags t ON t.workspace_id = l.workspace_id AND t.name = tag_name
WHERE l.tags IS NOT NULL
  AND jsonb_array_length(l.tags) > 0
ON CONFLICT (lead_id, tag_id) DO NOTHING;

-- ============================================================================
-- PASSO 4: Validar migração
-- ============================================================================

-- Contar tags migradas
SELECT COUNT(DISTINCT tag_id) as total_unique_tags FROM lead_tags;

-- Contar relacionamentos
SELECT COUNT(*) as total_lead_tags FROM lead_tags;

-- Verificar que nenhum lead perdeu tags
SELECT
  COUNT(DISTINCT idlead) as leads_with_tags_jsonb,
  COUNT(DISTINCT lead_id) as leads_with_tags_normalized
FROM (
  SELECT idlead FROM cvcrm_leads WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0
) leads
FULL OUTER JOIN (
  SELECT DISTINCT lead_id FROM lead_tags
) normalized ON leads.idlead = normalized.lead_id;

-- ============================================================================
-- PASSO 5: Remover coluna JSONB antiga (comentada por segurança)
-- ============================================================================

-- Descomente após validar migração manualmente:
-- ALTER TABLE cvcrm_leads DROP COLUMN tags;

-- ============================================================================
-- Notas de Execução
-- ============================================================================
/*
VALIDAR ANTES DE REMOVER COLUNA JSONB:

1. Verificar que todas as tags foram migradas:
   SELECT COUNT(*) FROM tags;
   SELECT COUNT(*) FROM lead_tags;

2. Confirmar que nenhum lead perdeu tags:
   SELECT
     COUNT(DISTINCT idlead) as total_leads_with_tags
   FROM cvcrm_leads
   WHERE tags IS NOT NULL AND jsonb_array_length(tags) > 0;

   SELECT COUNT(DISTINCT lead_id) FROM lead_tags;
   (Devem ser iguais)

3. Testar que aplicação funciona com nova estrutura:
   - Criar lead com tags
   - Listar leads por tag
   - Deletar tag

4. Após validação, executar:
   ALTER TABLE cvcrm_leads DROP COLUMN tags;

ROLLBACK:
  Se necessário, restaurar coluna:
  ALTER TABLE cvcrm_leads ADD COLUMN tags JSONB;

  Repopular com dados:
  UPDATE cvcrm_leads l
  SET tags = (
    SELECT jsonb_agg(t.name)
    FROM lead_tags lt
    JOIN tags t ON t.id = lt.tag_id
    WHERE lt.lead_id = l.idlead
  );
*/
