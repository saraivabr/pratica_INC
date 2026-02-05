-- Migration 045: Normalizar Relacionamentos JSONB de Leads
-- Objetivo: Mover campos JSONB de corretor, gestor, imobiliária para normalizados
-- Impacto: Remove redundância de dados, melhora integridade
-- Duração estimada: 1-2 minutos

-- ============================================================================
-- ANÁLISE: Campos JSONB a Normalizar
-- ============================================================================
/*
CAMPOS PROBLEMÁTICOS EM cvcrm_leads:

1. corretor: {id, nome, email, ...}
   - Problema: Duplicação com corretor_id
   - Solução: Remover campo, usar FK corretor_id

2. gestor: {id, nome, email, ...}
   - Problema: Duplicação com gestor_id
   - Solução: Remover campo, usar FK gestor_id

3. imobiliaria: {id, nome, ...}
   - Problema: Duplicação com imobiliaria_id
   - Solução: Remover campo, usar FK imobiliaria_id

4. situacao: {id, nome, ...}
   - Problema: Deveria estar em tabela situacao_leads
   - Solução: Remover campo, usar FK situacao_id

NOTA: Estas colunas armazenam "snapshots" dos dados de outras tabelas
      para fins de denormalização/cache, mas violam normalização.
      Mantém inconsistência se registro relacionado for atualizado.
*/

-- ============================================================================
-- PASSO 1: Validar que Foreign Keys já existem
-- ============================================================================

-- Verificar que as colunas _id já existem e têm dados
SELECT
  COUNT(CASE WHEN corretor_id IS NOT NULL THEN 1 END) as leads_com_corretor_id,
  COUNT(CASE WHEN gestor_id IS NOT NULL THEN 1 END) as leads_com_gestor_id,
  COUNT(CASE WHEN imobiliaria_id IS NOT NULL THEN 1 END) as leads_com_imobiliaria_id
FROM cvcrm_leads;

-- ============================================================================
-- PASSO 2: Validar dados em colunas JSONB
-- ============================================================================

-- Amostra de dados JSONB para análise manual
SELECT
  idlead,
  corretor,
  gestor,
  imobiliaria
FROM cvcrm_leads
WHERE corretor IS NOT NULL
LIMIT 5;

-- ============================================================================
-- PASSO 3: Remover colunas JSONB (após validação manual)
-- ============================================================================

-- Comentadas por segurança - executar manualmente após validar

-- ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS corretor;
-- ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS gestor;
-- ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS imobiliaria;
-- ALTER TABLE cvcrm_leads DROP COLUMN IF EXISTS situacao;

-- ============================================================================
-- PASSO 4: Criar views de compatibilidade (transitório)
-- ============================================================================

-- View: lead com dados do corretor, gestor, etc. em JSONB (compatibilidade)
CREATE OR REPLACE VIEW vw_lead_extended AS
SELECT
  l.*,
  CASE WHEN cc.cvcrm_id IS NOT NULL THEN
    jsonb_build_object(
      'id', cc.cvcrm_id,
      'nome', cc.nome,
      'email', cc.email
    )
  ELSE NULL
  END as corretor,
  CASE WHEN cu.cvcrm_id IS NOT NULL THEN
    jsonb_build_object(
      'id', cu.cvcrm_id,
      'nome', cu.nome,
      'email', cu.email
    )
  ELSE NULL
  END as gestor,
  CASE WHEN ci.cvcrm_id IS NOT NULL THEN
    jsonb_build_object(
      'id', ci.cvcrm_id,
      'nome', ci.nome
    )
  ELSE NULL
  END as imobiliaria
FROM cvcrm_leads l
LEFT JOIN cvcrm_corretores cc ON cc.cvcrm_id = l.corretor_id
LEFT JOIN cvcrm_usuarios cu ON cu.cvcrm_id = l.gestor_id
LEFT JOIN cvcrm_imobiliarias ci ON ci.cvcrm_id = l.imobiliaria_id;

COMMENT ON VIEW vw_lead_extended IS 'View de compatibilidade com código legado que usa campos JSONB';

-- ============================================================================
-- PASSO 5: Validar que FKs estão funcionando
-- ============================================================================

-- Verificar que há orphan records
SELECT COUNT(*) as orphan_corretor
FROM cvcrm_leads
WHERE corretor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM cvcrm_corretores WHERE cvcrm_id = cvcrm_leads.corretor_id);

SELECT COUNT(*) as orphan_gestor
FROM cvcrm_leads
WHERE gestor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM cvcrm_usuarios WHERE cvcrm_id = cvcrm_leads.gestor_id);

SELECT COUNT(*) as orphan_imobiliaria
FROM cvcrm_leads
WHERE imobiliaria_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM cvcrm_imobiliarias WHERE cvcrm_id = cvcrm_leads.imobiliaria_id);

-- Esperado: 0 orphans para cada query

-- ============================================================================
-- Notas de Execução
-- ============================================================================
/*
VALIDAR ANTES DE REMOVER COLUNAS JSONB:

1. Verificar que FKs não têm orphans:
   SELECT COUNT(*) FROM cvcrm_leads
   WHERE corretor_id NOT IN (SELECT cvcrm_id FROM cvcrm_corretores)
   AND corretor_id IS NOT NULL;
   (Deve ser 0)

2. Confirmar que código não usa campos JSONB:
   grep -r "lead\.corretor\." app/ lib/
   grep -r "lead\.gestor\." app/ lib/
   grep -r "lead\.imobiliaria\." app/ lib/
   (Deve retornar 0 results)

3. Testar que aplicação funciona:
   - Listar leads com corretor
   - Filtrar por imobiliária
   - Atualizar gestor

4. Após validação, executar:
   ALTER TABLE cvcrm_leads DROP COLUMN corretor;
   ALTER TABLE cvcrm_leads DROP COLUMN gestor;
   ALTER TABLE cvcrm_leads DROP COLUMN imobiliaria;
   ALTER TABLE cvcrm_leads DROP COLUMN situacao;

ROLLBACK:
  Se necessário, restaurar colunas (restaurar de backup é mais seguro):
  ALTER TABLE cvcrm_leads ADD COLUMN corretor JSONB;
  ALTER TABLE cvcrm_leads ADD COLUMN gestor JSONB;
  ALTER TABLE cvcrm_leads ADD COLUMN imobiliaria JSONB;
  ALTER TABLE cvcrm_leads ADD COLUMN situacao JSONB;

VANTAGENS DE REMOVER JSONB:
  ✅ Sem redundância de dados (single source of truth)
  ✅ Dados sempre sincronizados (não desincronizam)
  ✅ Queries mais simples (joins em vez de JSONB operators)
  ✅ Melhor performance (FK index em vez de JSONB scan)
  ✅ Integridade garantida (FK constraints)

QUERY PATTERNS (ANTES vs DEPOIS):

ANTES (JSONB):
  SELECT l.*, l.corretor->>'nome' as corretor_nome
  FROM cvcrm_leads l
  WHERE l.corretor->>'id' = '123';

DEPOIS (Normalizado):
  SELECT l.*, cc.nome as corretor_nome
  FROM cvcrm_leads l
  JOIN cvcrm_corretores cc ON cc.cvcrm_id = l.corretor_id
  WHERE l.corretor_id = 123;

PERFORMANCE IMPROVEMENT:
  - JSONB field extract: O(n) scan
  - FK join with index: O(1) lookup
  - Speedup: ~10-50x dependendo do volume
*/
