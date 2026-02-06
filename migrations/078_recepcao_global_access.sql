-- Migration 078: Make recepcao (plantão) a global/cross-workspace feature
--
-- Problem: Plantões created by admin in workspace X are invisible to corretores
-- in workspace Y due to RLS workspace isolation.
-- Solution: Disable RLS on recepcao tables so all users can see all plantões.
-- workspace_id is kept as metadata but no longer used for access control.

BEGIN;

-- Drop RLS policies
DROP POLICY IF EXISTS workspace_isolation_recepcao_plantoes ON recepcao_plantoes;
DROP POLICY IF EXISTS workspace_isolation_recepcao_presencas ON recepcao_presencas;

-- Disable RLS (also removes FORCE)
ALTER TABLE recepcao_plantoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE recepcao_presencas DISABLE ROW LEVEL SECURITY;

-- Record migration
INSERT INTO schema_migrations (filename, applied_at)
VALUES ('078_recepcao_global_access.sql', NOW())
ON CONFLICT DO NOTHING;

COMMIT;
