-- Migration 027: Fix critical missing columns causing app crashes
-- Issues found: total_messages_received, total_messages_sent, workspace_id in agent_configs

-- 1. Add missing columns to whatsapp_contacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_contacts' AND column_name = 'total_messages_received'
  ) THEN
    ALTER TABLE whatsapp_contacts ADD COLUMN total_messages_received INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'whatsapp_contacts' AND column_name = 'total_messages_sent'
  ) THEN
    ALTER TABLE whatsapp_contacts ADD COLUMN total_messages_sent INTEGER DEFAULT 0;
  END IF;
END $$;

-- 2. Add workspace_id to agent_configs (multi-tenant support)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agent_configs' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE agent_configs ADD COLUMN workspace_id INTEGER;
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_agent_configs_workspace ON agent_configs(workspace_id);

-- 3. Add EVOLUTION_WEBHOOK_SECRET to track security requirement
COMMENT ON TABLE agent_configs IS 'Agent configurations per workspace. Note: EVOLUTION_WEBHOOK_SECRET should be set in environment for production security.';
