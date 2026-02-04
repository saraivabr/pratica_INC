-- Migration 037: Add workspace_id to agent_configs table
-- The code uses workspace_id but table only has tenant_id

-- Add workspace_id column to agent_configs (same as tenant_id for backwards compatibility)
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

-- Update existing rows to set workspace_id = tenant_id
UPDATE agent_configs SET workspace_id = tenant_id WHERE workspace_id IS NULL;

-- Create index for workspace_id lookups
CREATE INDEX IF NOT EXISTS idx_agent_configs_workspace ON agent_configs(workspace_id);

COMMENT ON COLUMN agent_configs.workspace_id IS 'Workspace ID (same as tenant_id for backwards compatibility)';
