-- Migration 072: Standardize RLS policies to use current_workspace_id() function
--
-- Problem: 14 tables have RLS but policies use 3 different syntaxes:
--   A) workspace_id = current_workspace_id()                                    [8 tables - correct]
--   B) workspace_id = (current_setting('app.current_workspace_id', true))::integer  [5 tables - inline, inconsistent]
--   C) (workspace_id)::text = current_setting('app.current_workspace_id', true)     [1 table - wrong cast]
--
-- Fix: Standardize all to Syntax A with both USING and WITH CHECK clauses.
--
-- Tables to fix:
--   Syntax B: cvcrm_assistencias, cvcrm_atendimentos, cvcrm_leads, cvcrm_leads_tarefas, eventos
--   Syntax C: whatsapp_contacts

BEGIN;

-- ============================================================
-- Syntax B tables (inline current_setting, missing WITH CHECK)
-- ============================================================

-- 1. cvcrm_assistencias
DROP POLICY workspace_isolation_assistencias ON cvcrm_assistencias;
CREATE POLICY workspace_isolation_assistencias ON cvcrm_assistencias
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- 2. cvcrm_atendimentos
DROP POLICY workspace_isolation_atendimentos ON cvcrm_atendimentos;
CREATE POLICY workspace_isolation_atendimentos ON cvcrm_atendimentos
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- 3. cvcrm_leads
DROP POLICY workspace_isolation_leads ON cvcrm_leads;
CREATE POLICY workspace_isolation_leads ON cvcrm_leads
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- 4. cvcrm_leads_tarefas
DROP POLICY workspace_isolation_tarefas ON cvcrm_leads_tarefas;
CREATE POLICY workspace_isolation_tarefas ON cvcrm_leads_tarefas
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- 5. eventos
DROP POLICY workspace_isolation_eventos ON eventos;
CREATE POLICY workspace_isolation_eventos ON eventos
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

-- ============================================================
-- Syntax C table (wrong text cast, has WITH CHECK but wrong)
-- ============================================================

-- 6. whatsapp_contacts
DROP POLICY workspace_isolation ON whatsapp_contacts;
CREATE POLICY workspace_isolation_whatsapp_contacts ON whatsapp_contacts
  FOR ALL
  USING (workspace_id = current_workspace_id())
  WITH CHECK (workspace_id = current_workspace_id());

COMMIT;