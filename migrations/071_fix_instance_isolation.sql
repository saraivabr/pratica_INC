-- Migration 071: Fix instance isolation
-- 1. Fix user d027e287 (Hellen) who inherited wrong instance from workspace
-- 2. Clear workspace.evolution_instance_name (field should not exist per-workspace)
-- 3. Map orphan instance to correct user (João Gabriel)

BEGIN;

-- 1. Fix Hellen (d027e287) — she was assigned Fellipe's instance via workspace bug
-- Clear her instance so she can create her own on next session/start
UPDATE users
SET evolution_instance_name = NULL,
    evolution_connected = false,
    updated_at = NOW()
WHERE id = 'd027e287-919d-4fbd-af01-d6bfc84e1855'
  AND evolution_instance_name = 'corretor-26eb9297-5254-4dae-b459-42889b822cb3-1770388148051';

-- 2. Fix João Gabriel (7de6ce53) — his instance is on workspace 1157 but not on his user
-- Map his old orphan instance back to him
UPDATE users
SET evolution_instance_name = 'corretor-7de6ce53-8539-4190-982c-c2b0c4711402-1769670120482',
    updated_at = NOW()
WHERE id = '7de6ce53-8539-4190-982c-c2b0c4711402'
  AND evolution_instance_name IS NULL;

-- 3. Clear evolution_instance_name from ALL workspaces — instance is per-user not per-workspace
UPDATE workspaces
SET evolution_instance_name = NULL
WHERE evolution_instance_name IS NOT NULL;

COMMIT;
