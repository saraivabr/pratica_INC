-- Migration 023: Fix missing tables and columns
-- Fixes issues found during full system validation

-- 1. Create conversations table (used by Sofia AI chat)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);

-- 2. Add workspace_id to salva_leads_runs (already exists in salva_leads_conversations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'salva_leads_runs' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE salva_leads_runs ADD COLUMN workspace_id INTEGER;
  END IF;
END $$;

-- Backfill workspace_id from tenant_id mapping
UPDATE salva_leads_runs r
SET workspace_id = w.id
FROM tenants t
JOIN workspaces w ON w.owner_id::text = t.owner_id::text
WHERE r.tenant_id = t.id AND r.workspace_id IS NULL;

-- 3. Add missing columns to leads table for salva-leads module
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN workspace_id INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'corretor_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN corretor_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'whatsapp'
  ) THEN
    ALTER TABLE leads ADD COLUMN whatsapp VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'imovel_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN imovel_id INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'imovel_nome'
  ) THEN
    ALTER TABLE leads ADD COLUMN imovel_nome VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'imovel_preco'
  ) THEN
    ALTER TABLE leads ADD COLUMN imovel_preco NUMERIC(15,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'filtros'
  ) THEN
    ALTER TABLE leads ADD COLUMN filtros JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'qualificado'
  ) THEN
    ALTER TABLE leads ADD COLUMN qualificado BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'status'
  ) THEN
    ALTER TABLE leads ADD COLUMN status VARCHAR(50) DEFAULT 'novo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'nome'
  ) THEN
    -- Add nome as computed alias; backfill from name
    ALTER TABLE leads ADD COLUMN nome VARCHAR(255);
  END IF;
END $$;

-- Backfill nome from name if empty
UPDATE leads SET nome = name WHERE nome IS NULL AND name IS NOT NULL;
-- Backfill whatsapp from phone if empty
UPDATE leads SET whatsapp = phone WHERE whatsapp IS NULL AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_workspace ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_corretor ON leads(corretor_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- 4. Add imovel_nome to agendamentos (imovel_id already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agendamentos' AND column_name = 'imovel_nome'
  ) THEN
    ALTER TABLE agendamentos ADD COLUMN imovel_nome VARCHAR(255);
  END IF;
END $$;

-- 5. Create leads_interactions table (referenced by salva-leads/leads route)
CREATE TABLE IF NOT EXISTS leads_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tipo VARCHAR(50),
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_interactions_lead ON leads_interactions(lead_id);

-- 6. Trigger for conversations updated_at
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();
