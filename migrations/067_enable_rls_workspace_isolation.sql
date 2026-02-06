-- Migration 067: Enable Row Level Security (RLS) for Workspace Isolation (Phase 5)
--
-- Current state:
--   - 5 tables already have RLS + policies: cvcrm_leads, cvcrm_atendimentos,
--     cvcrm_assistencias, cvcrm_leads_tarefas, eventos
--   - 8 tables need RLS: cvcrm_lead_interacoes, cvcrm_reservas, whatsapp_messages,
--     comissao_vendas, recepcao_plantoes, recepcao_presencas, academy_progress, agendamentos
--
-- Strategy:
--   - RLS enabled WITHOUT "FORCE ROW LEVEL SECURITY"
--   - The app connects as 'pratica' user who OWNS most tables
--   - Table owners bypass RLS by default (PostgreSQL behavior)
--   - This means pool.query() calls (without workspace context) continue working
--   - RLS acts as defense-in-depth for any non-owner roles
--   - To fully enforce: later migrate all queries to withTenant() and add FORCE
--
-- Transfer ownership of postgres-owned tables to pratica first,
-- so RLS bypass-for-owner behavior is consistent.
--
-- Duration: < 1 minute

BEGIN;

-- ============================================================================
-- STEP 1: Create helper function
-- ============================================================================

CREATE OR REPLACE FUNCTION current_workspace_id() RETURNS INTEGER AS $$
SELECT NULLIF(current_setting('app.current_workspace_id', TRUE), '')::INTEGER;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION current_workspace_id() IS
'Returns current workspace_id from session. Set via: SELECT set_config(''app.current_workspace_id'', ''123'', false)';

-- ============================================================================
-- STEP 2: Transfer ownership of postgres-owned target tables to pratica
-- ============================================================================

ALTER TABLE recepcao_plantoes OWNER TO pratica;
ALTER TABLE recepcao_presencas OWNER TO pratica;

-- ============================================================================
-- STEP 3: Enable RLS on remaining 8 tables (5 already enabled)
-- ============================================================================

ALTER TABLE cvcrm_lead_interacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvcrm_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissao_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE recepcao_plantoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recepcao_presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create workspace isolation policies for new tables
-- ============================================================================

-- cvcrm_lead_interacoes
DROP POLICY IF EXISTS workspace_isolation_lead_interacoes ON cvcrm_lead_interacoes;
CREATE POLICY workspace_isolation_lead_interacoes ON cvcrm_lead_interacoes
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- cvcrm_reservas
DROP POLICY IF EXISTS workspace_isolation_reservas ON cvcrm_reservas;
CREATE POLICY workspace_isolation_reservas ON cvcrm_reservas
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- whatsapp_messages
DROP POLICY IF EXISTS workspace_isolation_whatsapp_messages ON whatsapp_messages;
CREATE POLICY workspace_isolation_whatsapp_messages ON whatsapp_messages
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- comissao_vendas
DROP POLICY IF EXISTS workspace_isolation_comissao_vendas ON comissao_vendas;
CREATE POLICY workspace_isolation_comissao_vendas ON comissao_vendas
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- recepcao_plantoes
DROP POLICY IF EXISTS workspace_isolation_recepcao_plantoes ON recepcao_plantoes;
CREATE POLICY workspace_isolation_recepcao_plantoes ON recepcao_plantoes
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- recepcao_presencas
DROP POLICY IF EXISTS workspace_isolation_recepcao_presencas ON recepcao_presencas;
CREATE POLICY workspace_isolation_recepcao_presencas ON recepcao_presencas
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- academy_progress
DROP POLICY IF EXISTS workspace_isolation_academy_progress ON academy_progress;
CREATE POLICY workspace_isolation_academy_progress ON academy_progress
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- agendamentos
DROP POLICY IF EXISTS workspace_isolation_agendamentos ON agendamentos;
CREATE POLICY workspace_isolation_agendamentos ON agendamentos
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- ============================================================================
-- STEP 5: Create safe views (workspace-scoped, for use with withTenant())
-- ============================================================================

CREATE OR REPLACE VIEW vw_leads_safe AS
SELECT * FROM cvcrm_leads
WHERE workspace_id = current_workspace_id();

CREATE OR REPLACE VIEW vw_lead_interacoes_safe AS
SELECT * FROM cvcrm_lead_interacoes
WHERE workspace_id = current_workspace_id();

CREATE OR REPLACE VIEW vw_reservas_safe AS
SELECT * FROM cvcrm_reservas
WHERE workspace_id = current_workspace_id();

CREATE OR REPLACE VIEW vw_whatsapp_messages_safe AS
SELECT * FROM whatsapp_messages
WHERE workspace_id = current_workspace_id();

COMMENT ON VIEW vw_leads_safe IS 'Workspace-scoped leads view - requires app.current_workspace_id to be set';
COMMENT ON VIEW vw_lead_interacoes_safe IS 'Workspace-scoped lead interactions view';
COMMENT ON VIEW vw_reservas_safe IS 'Workspace-scoped reservas view';
COMMENT ON VIEW vw_whatsapp_messages_safe IS 'Workspace-scoped WhatsApp messages view';

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

-- Create test function
CREATE OR REPLACE FUNCTION test_rls_isolation()
RETURNS TABLE (
  test_name TEXT,
  result BOOLEAN,
  details TEXT
) AS $$
BEGIN
  -- Test 1: RLS enabled on target tables
  RETURN QUERY
  SELECT
    'RLS Enabled (13 tables)'::TEXT,
    (SELECT COUNT(*) FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relrowsecurity = TRUE
       AND c.relname IN (
         'cvcrm_leads', 'cvcrm_lead_interacoes', 'cvcrm_reservas',
         'cvcrm_atendimentos', 'cvcrm_assistencias', 'cvcrm_leads_tarefas',
         'whatsapp_messages', 'eventos', 'comissao_vendas',
         'recepcao_plantoes', 'recepcao_presencas',
         'academy_progress', 'agendamentos'
       )) = 13,
    (SELECT COUNT(*)::TEXT || ' tables with RLS' FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relrowsecurity = TRUE
       AND c.relname IN (
         'cvcrm_leads', 'cvcrm_lead_interacoes', 'cvcrm_reservas',
         'cvcrm_atendimentos', 'cvcrm_assistencias', 'cvcrm_leads_tarefas',
         'whatsapp_messages', 'eventos', 'comissao_vendas',
         'recepcao_plantoes', 'recepcao_presencas',
         'academy_progress', 'agendamentos'
       ))::TEXT;

  -- Test 2: All 13 policies exist
  RETURN QUERY
  SELECT
    'Policies Created (13 policies)'::TEXT,
    (SELECT COUNT(*) FROM pg_policies
     WHERE schemaname = 'public'
       AND policyname LIKE 'workspace_isolation_%') = 13,
    (SELECT COUNT(*)::TEXT || ' workspace_isolation policies' FROM pg_policies
     WHERE schemaname = 'public'
       AND policyname LIKE 'workspace_isolation_%')::TEXT;

  -- Test 3: current_workspace_id function exists
  RETURN QUERY
  SELECT
    'current_workspace_id() function'::TEXT,
    EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_workspace_id'),
    'Function exists: ' || EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_workspace_id')::TEXT;

  -- Test 4: FORCE RLS is NOT set (safety check)
  RETURN QUERY
  SELECT
    'FORCE RLS disabled (safe mode)'::TEXT,
    (SELECT COUNT(*) FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relforcerowsecurity = TRUE) = 0,
    'Tables with FORCE RLS: ' || (SELECT COUNT(*)::TEXT FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relforcerowsecurity = TRUE)::TEXT;

  -- Test 5: All target tables owned by pratica
  RETURN QUERY
  SELECT
    'Tables owned by pratica'::TEXT,
    (SELECT COUNT(*) FROM pg_tables
     WHERE schemaname = 'public'
       AND tableowner = 'pratica'
       AND tablename IN (
         'cvcrm_leads', 'cvcrm_lead_interacoes', 'cvcrm_reservas',
         'cvcrm_atendimentos', 'cvcrm_assistencias', 'cvcrm_leads_tarefas',
         'whatsapp_messages', 'eventos', 'comissao_vendas',
         'recepcao_plantoes', 'recepcao_presencas',
         'academy_progress', 'agendamentos'
       )) = 13,
    (SELECT COUNT(*)::TEXT || '/13 owned by pratica' FROM pg_tables
     WHERE schemaname = 'public' AND tableowner = 'pratica'
       AND tablename IN (
         'cvcrm_leads', 'cvcrm_lead_interacoes', 'cvcrm_reservas',
         'cvcrm_atendimentos', 'cvcrm_assistencias', 'cvcrm_leads_tarefas',
         'whatsapp_messages', 'eventos', 'comissao_vendas',
         'recepcao_plantoes', 'recepcao_presencas',
         'academy_progress', 'agendamentos'
       ))::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Run tests
SELECT * FROM test_rls_isolation();

COMMIT;

-- ============================================================================
-- Post-migration notes
-- ============================================================================
/*
CURRENT BEHAVIOR:
  - 'pratica' user owns all RLS-enabled tables
  - FORCE ROW LEVEL SECURITY is NOT set
  - Therefore: pratica bypasses all RLS policies (PostgreSQL default)
  - pool.query() calls continue working unchanged
  - RLS protects against any non-owner database roles

TO FULLY ENFORCE RLS (future):
  1. Migrate all queries to use withTenant() from lib/tenant-context.ts
  2. Then run: ALTER TABLE <table> FORCE ROW LEVEL SECURITY;
  3. This will require app.current_workspace_id to be set on every connection

ROLLBACK:
  ALTER TABLE cvcrm_lead_interacoes DISABLE ROW LEVEL SECURITY;
  ALTER TABLE cvcrm_reservas DISABLE ROW LEVEL SECURITY;
  ALTER TABLE whatsapp_messages DISABLE ROW LEVEL SECURITY;
  ALTER TABLE comissao_vendas DISABLE ROW LEVEL SECURITY;
  ALTER TABLE recepcao_plantoes DISABLE ROW LEVEL SECURITY;
  ALTER TABLE recepcao_presencas DISABLE ROW LEVEL SECURITY;
  ALTER TABLE academy_progress DISABLE ROW LEVEL SECURITY;
  ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
*/
