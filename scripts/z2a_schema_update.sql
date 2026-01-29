-- ============================================
-- Z2A UPGRADE - CRM & FUNNEL SUPPORT
-- ============================================

-- 1. Create Funnels and Stages
CREATE TABLE IF NOT EXISTS funnels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS funnel_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT '#2563EB',
  position INT NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT false, -- If true, cannot be deleted (e.g. "Won", "Lost")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_funnel_stages_position ON funnel_stages(funnel_id, position);

-- 2. Create Local Leads Table (Mirror + Extension)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- CVCRM Link (Optional)
  cvcrm_id VARCHAR(50),
  
  -- Core Data
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50), -- normalized
  
  -- Sales Data
  funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Owner/Agent
  
  -- Z2A Features
  score INT DEFAULT 0, -- AI Score
  temperature VARCHAR(20) DEFAULT 'cold', -- cold, warm, hot
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_cvcrm ON leads(cvcrm_id);

-- 3. Seed Default Funnel
DO $$
DECLARE
  v_funnel_id UUID;
BEGIN
  -- Insert Default Funnel if not exists
  INSERT INTO funnels (name, description)
  VALUES ('Funil de Vendas Padrão', 'Funil padrão para corretores')
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_funnel_id;

  -- If we just created it (or found it), ensure stages exist
  IF v_funnel_id IS NULL THEN
    SELECT id INTO v_funnel_id FROM funnels WHERE name = 'Funil de Vendas Padrão' LIMIT 1;
  END IF;

  INSERT INTO funnel_stages (funnel_id, name, color, position, is_system) VALUES
  (v_funnel_id, 'Novo Lead', '#3B82F6', 0, false), -- Blue
  (v_funnel_id, 'Contato Realizado', '#10B981', 1, false), -- Green
  (v_funnel_id, 'Visitando', '#F59E0B', 2, false), -- Yellow
  (v_funnel_id, 'Em Proposta', '#8B5CF6', 3, false), -- Purple
  (v_funnel_id, 'Em Negociação', '#EC4899', 4, false), -- Pink
  (v_funnel_id, 'Fechado Ganho', '#16A34A', 5, true), -- Green Dark
  (v_funnel_id, 'Fechado Perdido', '#EF4444', 6, true) -- Red
  ON CONFLICT DO NOTHING;
END $$;

-- 4. Enable RLS
ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policies (Permissive for now, based on existing schema style)
CREATE POLICY "Allow all for funnels" ON funnels FOR ALL USING (true);
CREATE POLICY "Allow all for funnel_stages" ON funnel_stages FOR ALL USING (true);
CREATE POLICY "Allow all for leads" ON leads FOR ALL USING (true);
