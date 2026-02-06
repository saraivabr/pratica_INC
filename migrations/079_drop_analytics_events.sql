-- Migration 079: Drop analytics_events table
-- Consolidates tracking into a single system (tracking_events via /api/track)
-- analytics_events had 0 rows and was never successfully used (missing workspace_id column)

BEGIN;

DROP TABLE IF EXISTS analytics_events CASCADE;

INSERT INTO schema_migrations (filename) VALUES ('079_drop_analytics_events.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
