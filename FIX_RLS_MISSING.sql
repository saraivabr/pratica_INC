-- ============================================================================
-- FIX: Row Level Security - Ativar RLS em Tabelas Faltantes
-- ============================================================================
-- Data: 29 Jan 2025
-- Problema: Várias tabelas CVCRM sem RLS ativo
-- Impacto: ALTO - Possível vazamento se queries não usarem withTenant()
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ATIVAR RLS EM TABELAS CVCRM
-- ============================================================================

-- cvcrm_agendamentos
ALTER TABLE cvcrm_agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_isolation_agendamentos ON cvcrm_agendamentos;
CREATE POLICY workspace_isolation_agendamentos ON cvcrm_agendamentos
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

COMMENT ON POLICY workspace_isolation_agendamentos ON cvcrm_agendamentos IS 
  'Isola agendamentos por workspace';

-- cvcrm_atendimentos_arquivos
ALTER TABLE cvcrm_atendimentos_arquivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workspace_isolation_atendimentos_arquivos ON cvcrm_atendimentos_arquivos;
CREATE POLICY workspace_isolation_atendimentos_arquivos ON cvcrm_atendimentos_arquivos
  USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);

-- cvcrm_atendimento_interacoes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cvcrm_atendimento_interacoes' 
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE cvcrm_atendimento_interacoes ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS workspace_isolation_atendimento_interacoes ON cvcrm_atendimento_interacoes;
    CREATE POLICY workspace_isolation_atendimento_interacoes ON cvcrm_atendimento_interacoes
      USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);
  END IF;
END $$;

-- cvcrm_campanhas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cvcrm_campanhas' 
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE cvcrm_campanhas ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS workspace_isolation_campanhas ON cvcrm_campanhas;
    CREATE POLICY workspace_isolation_campanhas ON cvcrm_campanhas
      USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);
  END IF;
END $$;

-- cvcrm_assistencia_itens
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cvcrm_assistencia_itens' 
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE cvcrm_assistencia_itens ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS workspace_isolation_assistencia_itens ON cvcrm_assistencia_itens;
    CREATE POLICY workspace_isolation_assistencia_itens ON cvcrm_assistencia_itens
      USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);
  END IF;
END $$;

-- cvcrm_assistencia_tempo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cvcrm_assistencia_tempo' 
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE cvcrm_assistencia_tempo ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS workspace_isolation_assistencia_tempo ON cvcrm_assistencia_tempo;
    CREATE POLICY workspace_isolation_assistencia_tempo ON cvcrm_assistencia_tempo
      USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);
  END IF;
END $$;

-- cvcrm_assistencia_visitas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cvcrm_assistencia_visitas' 
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE cvcrm_assistencia_visitas ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS workspace_isolation_assistencia_visitas ON cvcrm_assistencia_visitas;
    CREATE POLICY workspace_isolation_assistencia_visitas ON cvcrm_assistencia_visitas
      USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);
  END IF;
END $$;

-- cvcrm_assistencia_workflow
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cvcrm_assistencia_workflow' 
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE cvcrm_assistencia_workflow ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS workspace_isolation_assistencia_workflow ON cvcrm_assistencia_workflow;
    CREATE POLICY workspace_isolation_assistencia_workflow ON cvcrm_assistencia_workflow
      USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);
  END IF;
END $$;

-- cvcrm_atendimento_respostas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cvcrm_atendimento_respostas' 
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE cvcrm_atendimento_respostas ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS workspace_isolation_atendimento_respostas ON cvcrm_atendimento_respostas;
    CREATE POLICY workspace_isolation_atendimento_respostas ON cvcrm_atendimento_respostas
      USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);
  END IF;
END $$;

-- cvcrm_atendimento_tarefas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cvcrm_atendimento_tarefas' 
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE cvcrm_atendimento_tarefas ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS workspace_isolation_atendimento_tarefas ON cvcrm_atendimento_tarefas;
    CREATE POLICY workspace_isolation_atendimento_tarefas ON cvcrm_atendimento_tarefas
      USING (workspace_id = current_setting('app.current_workspace_id', true)::INTEGER);
  END IF;
END $$;

-- ============================================================================
-- 2. VALIDAÇÃO PÓS-ATIVAÇÃO
-- ============================================================================

DO $$
DECLARE
  tabela_record RECORD;
  total_rls INTEGER := 0;
  total_sem_rls INTEGER := 0;
BEGIN
  RAISE NOTICE '=== VALIDAÇÃO RLS ===';
  RAISE NOTICE '';
  
  FOR tabela_record IN 
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND (tablename LIKE 'cvcrm_%' OR tablename LIKE 'whatsapp_%' OR tablename = 'eventos')
    ORDER BY tablename
  LOOP
    IF tabela_record.rowsecurity THEN
      total_rls := total_rls + 1;
      RAISE NOTICE '✅ % - RLS ATIVO', tabela_record.tablename;
    ELSE
      total_sem_rls := total_sem_rls + 1;
      RAISE NOTICE '❌ % - SEM RLS', tabela_record.tablename;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '---';
  RAISE NOTICE 'Total com RLS: %', total_rls;
  RAISE NOTICE 'Total sem RLS: %', total_sem_rls;
  RAISE NOTICE '';
  
  IF total_sem_rls = 0 THEN
    RAISE NOTICE '✅ PERFEITO! Todas as tabelas têm RLS ativo.';
  ELSIF total_sem_rls < 5 THEN
    RAISE WARNING '⚠️  Ainda existem % tabelas sem RLS (provavelmente tabelas auxiliares sem workspace_id)', total_sem_rls;
  ELSE
    RAISE WARNING '❌ ATENÇÃO! % tabelas ainda sem RLS. Verificar se precisam de workspace_id.', total_sem_rls;
  END IF;
END $$;

-- ============================================================================
-- 3. LISTAR POLICIES CRIADAS
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
-- 4. COMMIT (descomente após validar resultado)
-- ============================================================================

-- COMMIT;
ROLLBACK; -- REMOVER após validar resultado com ROLLBACK primeiro!

-- ============================================================================
-- INSTRUÇÕES DE USO
-- ============================================================================

/*

1. PRIMEIRA EXECUÇÃO (teste):
   psql -h localhost -U pratica -d pratica -f FIX_RLS_MISSING.sql

   → Script vai rodar mas fazer ROLLBACK no final
   → Valide os números em "VALIDAÇÃO RLS"

2. EXECUTAR DE VERDADE:
   - Editar linha final: trocar ROLLBACK por COMMIT
   - Rodar novamente:
     psql -h localhost -U pratica -d pratica -f FIX_RLS_MISSING.sql

3. VALIDAR RESULTADO:
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
     AND (tablename LIKE 'cvcrm_%' OR tablename LIKE 'whatsapp_%')
   ORDER BY tablename;
   
   → rowsecurity deve ser TRUE para todas as tabelas principais

*/
