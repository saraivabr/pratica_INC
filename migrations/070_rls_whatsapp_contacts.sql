-- Migration 070: Enable RLS on whatsapp_contacts
-- Ensures contacts are isolated per workspace (same as whatsapp_messages)

BEGIN;

-- Enable RLS
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner
ALTER TABLE whatsapp_contacts FORCE ROW LEVEL SECURITY;

-- Create policy for workspace isolation
CREATE POLICY workspace_isolation ON whatsapp_contacts
  USING (workspace_id::text = current_setting('app.current_workspace_id', true))
  WITH CHECK (workspace_id::text = current_setting('app.current_workspace_id', true));

-- Add index for instance_name + workspace_id if not exists
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance_workspace
  ON whatsapp_contacts (workspace_id, instance_name);

-- Add index for messages by workspace + instance for faster filtering
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_workspace_instance
  ON whatsapp_messages (workspace_id, instance_name);

COMMIT;
