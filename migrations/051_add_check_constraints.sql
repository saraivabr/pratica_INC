-- Migration 051: Add CHECK constraints for enums and validated columns
--
-- Pre-check results:
--   chk_users_role already exists with values: admin, gerente, corretor, user, super_admin, master_admin
--   chk_workspaces_type already exists with values: imobiliaria, construtora, personal, demo
--   chk_workspace_members_role does NOT exist yet
--
-- Only adding the missing constraint.

BEGIN;

-- Workspace member roles (no data yet, defining valid values)
ALTER TABLE workspace_members ADD CONSTRAINT chk_workspace_members_role
  CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

COMMIT;
