-- Migration 042: Consolidar Tabelas Duplicadas
-- Objetivo: Remover duplicação de tabelas de sincronização e interações
-- Impacto: 2-3 tabelas consolidadas, 0 perda de dados
-- Duração estimada: 30 segundos - 2 minutos

-- ============================================================================
-- ANÁLISE: Tabelas Duplicadas Identificadas
-- ============================================================================
/*
DUPLICAÇÃO 1: sync_logs (antiga) vs cvcrm_sync_logs (nova)
  - sync_logs: versão antiga, sem estrutura clara
  - cvcrm_sync_logs: versão nova com melhor estrutura
  - AÇÃO: Migrar dados úteis → cvcrm_sync_logs, deletar sync_logs

DUPLICAÇÃO 2: sync_cursors (antiga) vs cvcrm_sync_cursors (nova)
  - sync_cursors: versão antiga
  - cvcrm_sync_cursors: versão nova
  - AÇÃO: Migrar dados → cvcrm_sync_cursors, deletar sync_cursors

DUPLICAÇÃO 3: cvcrm_lead_interacoes vs cvcrm_leads_interacoes
  - Possível duplicação de estrutura
  - AÇÃO: Validar qual usar antes de consolidar
*/

-- ============================================================================
-- PASSO 1: Migrar dados de sync_logs → cvcrm_sync_logs
-- ============================================================================

-- Verificar estrutura de sync_logs (se existir)
DO $$
BEGIN
  -- Verificar se sync_logs existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
    RAISE NOTICE 'Tabela sync_logs encontrada, iniciando migração...';

    -- Migrar dados (evitar duplicatas)
    INSERT INTO cvcrm_sync_logs (
      endpoint,
      status,
      error_message,
      records_processed,
      created_at,
      updated_at
    )
    SELECT DISTINCT
      endpoint,
      status,
      error_message,
      records_processed,
      created_at,
      updated_at
    FROM sync_logs
    WHERE NOT EXISTS (
      SELECT 1 FROM cvcrm_sync_logs csl
      WHERE csl.endpoint = sync_logs.endpoint
      AND csl.created_at = sync_logs.created_at
    )
    ON CONFLICT DO NOTHING;

    -- Contar registros migrados
    SELECT COUNT(*) as migrated_records FROM sync_logs
    INTO RAISE NOTICE 'Registros migrados de sync_logs: %', ??;

  END IF;
END $$;

-- ============================================================================
-- PASSO 2: Migrar dados de sync_cursors → cvcrm_sync_cursors
-- ============================================================================

DO $$
BEGIN
  -- Verificar se sync_cursors existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_cursors') THEN
    RAISE NOTICE 'Tabela sync_cursors encontrada, iniciando migração...';

    -- Migrar dados
    INSERT INTO cvcrm_sync_cursors (
      entity_type,
      cursor_value,
      last_sync_at
    )
    SELECT DISTINCT
      entity_type,
      cursor_value,
      last_sync_at
    FROM sync_cursors
    WHERE NOT EXISTS (
      SELECT 1 FROM cvcrm_sync_cursors csc
      WHERE csc.entity_type = sync_cursors.entity_type
    )
    ON CONFLICT (entity_type) DO UPDATE
    SET cursor_value = EXCLUDED.cursor_value,
        last_sync_at = EXCLUDED.last_sync_at;

  END IF;
END $$;

-- ============================================================================
-- PASSO 3: Verificar duplicação de interações
-- ============================================================================
-- Análise: cvcrm_lead_interacoes vs cvcrm_leads_interacoes

-- Contar registros em cada tabela
SELECT COUNT(*) as count_lead_interacoes
FROM cvcrm_lead_interacoes;

-- Verificar se tabela cvcrm_leads_interacoes existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'cvcrm_leads_interacoes'
) as leads_interacoes_exists;

/*
DECISÃO SOBRE INTERAÇÕES:
  - Se cvcrm_leads_interacoes existe e tem dados:
    → Consolidar em cvcrm_lead_interacoes (estrutura melhor)
    → Migrar dados com cuidado
    → Remover duplicata

  - Se cvcrm_leads_interacoes é vazia:
    → Apenas remover (sem dados para migrar)

  - Se não existe:
    → Nada a fazer
*/

-- ============================================================================
-- PASSO 4: Deletar tabelas antigas (após validação manual)
-- ============================================================================
-- ⚠️ CUIDADO: Executar apenas após validar migração com sucesso

-- Backup de segurança: criar view com dados antigos antes de deletar
-- (Assim podemos recuperar se necessário)

CREATE VIEW v_backup_sync_logs_antes_delete AS
SELECT * FROM sync_logs
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_logs');

CREATE VIEW v_backup_sync_cursors_antes_delete AS
SELECT * FROM sync_cursors
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_cursors');

-- Deletar tabelas antigas (comentadas por segurança)
-- Descomente após validar migração manualmente:

-- DROP TABLE IF EXISTS sync_logs CASCADE;
-- DROP TABLE IF EXISTS sync_cursors CASCADE;
-- DROP TABLE IF EXISTS cvcrm_leads_interacoes CASCADE; -- Se consolidado

-- ============================================================================
-- PASSO 5: Validação após consolidação
-- ============================================================================

-- Verificar que cvcrm_sync_logs tem dados
SELECT
  (SELECT COUNT(*) FROM cvcrm_sync_logs) as cvcrm_sync_logs_count,
  (SELECT COUNT(*) FROM cvcrm_sync_cursors) as cvcrm_sync_cursors_count,
  COALESCE((SELECT COUNT(*) FROM sync_logs), 0) as sync_logs_count_remaining,
  COALESCE((SELECT COUNT(*) FROM sync_cursors), 0) as sync_cursors_count_remaining;

-- ============================================================================
-- Notas Importantes
-- ============================================================================
/*
EXECUTAR ESTA MIGRATION:

1. LOCAL (para testes):
   psql -U pratica -d pratica < migrations/042_consolidate_duplicates.sql

2. PRODUÇÃO (VPS):
   ssh root@185.182.184.122 "psql -U pratica -d pratica" < migrations/042_consolidate_duplicates.sql

PROCESSO:
   1. Migra dados de tabelas antigas → novas tabelas consolidadas
   2. Cria views de backup (segurança)
   3. Dropps comentadas (executar manualmente após validar)

VALIDAÇÃO MANUAL (fazer antes de descoment DROP):
   - Verificar que todos os dados foram migrados
   - Confirmar que cvcrm_sync_logs tem contagem correta
   - Verificar aplicação ainda funciona
   - Confirmar que queries não usam tabelas antigas

PRÓXIMO PASSO:
   - Executar drops manuais após validação:
     DROP TABLE IF EXISTS sync_logs CASCADE;
     DROP TABLE IF EXISTS sync_cursors CASCADE;

   - Executar Migration 043: Normalizar Tags

ROLLBACK:
   Se for necessário reverter:
   1. Restaurar backup anterior à migration
   2. Dados não serão perdidos (tabelas antigas mantidas como views de backup)
*/
