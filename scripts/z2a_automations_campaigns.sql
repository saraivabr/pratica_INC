-- ============================================
-- Z2A UPGRADE - AUTOMATIONS & CAMPAIGNS
-- ============================================

-- 1. Automations Table
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Trigger Logic
  trigger_type VARCHAR(50) NOT NULL, -- 'idle_in_stage', 'stage_changed', 'new_lead'
  trigger_config JSONB DEFAULT '{}', -- { "stage_id": "...", "days": 3 }
  
  -- Action Logic
  action_type VARCHAR(50) NOT NULL, -- 'send_whatsapp', 'notify_user', 'move_stage'
  action_config JSONB DEFAULT '{}', -- { "template": "Olá...", "target_stage_id": "..." }
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Content
  message_template TEXT NOT NULL,
  
  -- Segmentation (stored as JSON filters)
  segmentation_config JSONB DEFAULT '{}', -- { "stage_id": "...", "temperature": "cold" }
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'processing', 'completed'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  stats JSONB DEFAULT '{"total": 0, "sent": 0, "failed": 0, "replied": 0}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Campaign Leads (Tracking individual messages in a campaign)
CREATE TABLE IF NOT EXISTS campaign_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'replied'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead ON campaign_leads(lead_id);

-- 4. Insert Default Automations (Examples)
INSERT INTO automations (name, trigger_type, trigger_config, action_type, action_config)
VALUES 
(
  'Reativar Leads Parados (3 dias)', 
  'idle_in_stage', 
  '{"stage_name": "Novo Lead", "days": 3}', 
  'notify_user', 
  '{"message": "O lead {lead_name} está parado há 3 dias. Faça um follow-up!"}'
),
(
  'Boas-vindas Lead Novo',
  'new_lead',
  '{}',
  'send_whatsapp',
  '{"message": "Olá {lead_name}, bem-vindo à Pratica! Sou a Sofia. Como posso ajudar?"}'
);

-- 5. Enable RLS
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

-- Permissive Policies
CREATE POLICY "Allow all for automations" ON automations FOR ALL USING (true);
CREATE POLICY "Allow all for campaigns" ON campaigns FOR ALL USING (true);
CREATE POLICY "Allow all for campaign_leads" ON campaign_leads FOR ALL USING (true);
