-- Migration 070: Fix NULL workspace_id values in 5 tables
-- Sets correct workspace_id and adds NOT NULL constraints
--
-- Tables affected:
--   1. imobiliarias: 243/244 rows NULL → set to 1 (Admin workspace, shared reference data)
--   2. whatsapp_synced_contacts: 98/440 rows NULL → set to 1 (synced same day as ws=1 contacts)
--   3. recepcao_feriados: 12/12 rows NULL → set to 1 (national holidays, no conflict with unique)
--   4. conversations: 1/4 rows NULL → set to 1 (user_id FK points to user in workspace 1)
--   5. hierarquias: 1/7 rows NULL → set to 1 (recepcionista role, matches other 6 rows)
--
-- After UPDATE, ALTER each column to NOT NULL to prevent future gaps.

BEGIN;

-- ============================================================
-- 1. imobiliarias (243 rows with NULL workspace_id)
--    These are shared reference data (imobiliaria names from corretor signup).
--    Referenced by users across many workspaces, but the data belongs
--    to workspace 1 (Admin workspace) as the primary data hub.
-- ============================================================
UPDATE imobiliarias
SET workspace_id = 1
WHERE workspace_id IS NULL;

ALTER TABLE imobiliarias
  ALTER COLUMN workspace_id SET NOT NULL;

-- ============================================================
-- 2. whatsapp_synced_contacts (98 rows with NULL workspace_id)
--    Synced on 2026-01-29 ~08:57, same session as workspace=1 contacts
--    (synced at ~07:05). All have @s.whatsapp.net jids.
--    No duplicate remote_jid conflicts with the unique(workspace_id, remote_jid).
-- ============================================================
UPDATE whatsapp_synced_contacts
SET workspace_id = 1
WHERE workspace_id IS NULL;

ALTER TABLE whatsapp_synced_contacts
  ALTER COLUMN workspace_id SET NOT NULL;

-- ============================================================
-- 3. recepcao_feriados (12 rows, all NULL)
--    National Brazilian holidays for 2026.
--    No conflicts with the unique(workspace_id, data) constraint.
-- ============================================================
UPDATE recepcao_feriados
SET workspace_id = 1
WHERE workspace_id IS NULL;

ALTER TABLE recepcao_feriados
  ALTER COLUMN workspace_id SET NOT NULL;

-- ============================================================
-- 4. conversations (1 row with NULL workspace_id)
--    user_id = 26eb9297-5254-4dae-b459-42889b822cb3 → users.workspace_id = 1
-- ============================================================
UPDATE conversations
SET workspace_id = 1
WHERE workspace_id IS NULL;

ALTER TABLE conversations
  ALTER COLUMN workspace_id SET NOT NULL;

-- ============================================================
-- 5. hierarquias (1 row: "recepcionista" with NULL workspace_id)
--    All other 6 hierarquias have workspace_id = 1.
--    This role is not referenced by any user.
-- ============================================================
UPDATE hierarquias
SET workspace_id = 1
WHERE workspace_id IS NULL;

ALTER TABLE hierarquias
  ALTER COLUMN workspace_id SET NOT NULL;

COMMIT;
