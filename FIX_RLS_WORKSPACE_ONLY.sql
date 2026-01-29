-- ============================================================================
-- FIX: Row Level Security - Tabelas com workspace_id
-- ============================================================================
-- Aplica RLS apenas em tabelas que têm coluna workspace_id
-- Tabelas CVCRM usam outro método de isolamento (gerente_id/imobiliaria_id)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. AGENT_CONFIGS
-- ============================================================================
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_isolation_agent_configs ON agent_configs;
CREATE POLICY workspace_isolation_agent_configs ON agent_configs
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

COMMENT ON POLICY workspace_isolation_agent_configs ON agent_configs IS 
  'Isola agent configs por workspace';

-- ============================================================================
-- 2. AUTOMACOES_FOLLOWUP
-- ============================================================================
ALTER TABLE automacoes_followup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_isolation_automacoes ON automacoes_followup;
CREATE POLICY workspace_isolation_automacoes ON automacoes_followup
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

COMMENT ON POLICY workspace_isolation_automacoes ON automacoes_followup IS 
  'Isola automações por workspace';

-- ============================================================================
-- 3. LEMBRETES
-- ============================================================================
ALTER TABLE lembretes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_isolation_lembretes ON lembretes;
CREATE POLICY workspace_isolation_lembretes ON lembretes
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

COMMENT ON POLICY workspace_isolation_lembretes ON lembretes IS 
  'Isola lembretes por workspace';

-- ============================================================================
-- 4. NOTIFICACOES
-- ============================================================================
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_isolation_notificacoes ON notificacoes;
CREATE POLICY workspace_isolation_notificacoes ON notificacoes
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

COMMENT ON POLICY workspace_isolation_notificacoes ON notificacoes IS 
  'Isola notificações por workspace';

-- ============================================================================
-- 5. VALIDAÇÃO
-- ============================================================================
DO $$
DECLARE
  tabela_record RECORD;
  total_rls INTEGER := 0;
  total_sem_rls INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VALIDAÇÃO RLS (Tabelas com workspace_id) ===';
  RAISE NOTICE '';
  
  FOR tabela_record IN 
    SELECT t.table_name, 
           (SELECT relrowsecurity FROM pg_class WHERE relname = t.table_name) as rls_enabled
    FROM information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name
    WHERE c.table_schema = 'public' 
      AND c.column_name = 'workspace_id'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    IF tabela_record.rls_enabled THEN
      total_rls := total_rls + 1;
      RAISE NOTICE '✅ % - RLS ATIVO', tabela_record.table_name;
    ELSE
      total_sem_rls := total_sem_rls + 1;
      RAISE NOTICE '❌ % - SEM RLS', tabela_record.table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '---';
  RAISE NOTICE 'Total com RLS: %', total_rls;
  RAISE NOTICE 'Total sem RLS: %', total_sem_rls;
  RAISE NOTICE '';
  
  IF total_sem_rls = 0 THEN
    RAISE NOTICE '✅ PERFEITO! Todas as tabelas com workspace_id têm RLS ativo.';
  ELSE
    RAISE WARNING '⚠️ % tabelas com workspace_id ainda sem RLS', total_sem_rls;
  END IF;
END $$;

-- ============================================================================
-- 6. POLICIES CRIADAS
-- ============================================================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== POLICIES CRIADAS ===';
  RAISE NOTICE '';
  
  FOR policy_record IN 
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND policyname LIKE 'workspace_isolation_%'
    ORDER BY tablename
  LOOP
    RAISE NOTICE '📋 %.%', policy_record.tablename, policy_record.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- 7. NOTA SOBRE CVCRM
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== NOTA: Tabelas CVCRM ===';
  RAISE NOTICE 'Tabelas CVCRM não usam workspace_id.';
  RAISE NOTICE 'Isolamento é feito via gerente_id/imobiliaria_id nas queries.';
  RAISE NOTICE 'Verificar withTenant() em lib/db.ts está sendo usado corretamente.';
  RAISE NOTICE '';
END $$;

COMMIT;
