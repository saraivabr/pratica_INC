-- =====================================================
-- Migration 001: Full CRM Integration
-- Execute no Supabase ou PostgreSQL local
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Migration 1: CRM Pipeline
-- =====================================================

-- Funnels (funis de vendas)
CREATE TABLE IF NOT EXISTS funnels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Funnel Stages (etapas do funil)
CREATE TABLE IF NOT EXISTS funnel_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_id UUID REFERENCES funnels(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(20) DEFAULT '#3B82F6',
  position INTEGER NOT NULL DEFAULT 0,
  is_won_stage BOOLEAN DEFAULT false,
  is_lost_stage BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads internos
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES funnel_stages(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  score INTEGER DEFAULT 0,
  temperature VARCHAR(20) DEFAULT 'cold',
  tags JSONB DEFAULT '[]',
  source VARCHAR(100),
  cvcrm_lead_id INTEGER,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_funnel ON leads(funnel_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);

-- =====================================================
-- Migration 2: Automations
-- =====================================================

CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  action_type VARCHAR(50) NOT NULL,
  action_config JSONB DEFAULT '{}',
  executions_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automations_active ON automations(is_active);

-- =====================================================
-- Migration 3: Activities (Agenda)
-- =====================================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  priority VARCHAR(20) DEFAULT 'medium',
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  location TEXT,
  notes TEXT,
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled ON activities(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);

-- =====================================================
-- Migration 4: Campaigns
-- =====================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  message_template TEXT NOT NULL,
  segmentation_config JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  stats JSONB DEFAULT '{"total": 0, "sent": 0, "delivered": 0, "read": 0, "replied": 0, "failed": 0}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON campaign_leads(campaign_id);

-- =====================================================
-- Seed: Funil Padrao (executar apenas uma vez)
-- =====================================================

-- Inserir funil padrao apenas se nao existir
INSERT INTO funnels (id, name, description, is_active)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Funil Principal',
  'Funil padrao de vendas',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM funnels WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Inserir etapas padrao apenas se nao existirem
INSERT INTO funnel_stages (funnel_id, name, color, position, is_won_stage, is_lost_stage)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  stage.name,
  stage.color,
  stage.position,
  stage.is_won_stage,
  stage.is_lost_stage
FROM (VALUES
  ('Novo Lead', '#6B7280', 0, false, false),
  ('Contato Realizado', '#3B82F6', 1, false, false),
  ('Visita Agendada', '#8B5CF6', 2, false, false),
  ('Proposta Enviada', '#F59E0B', 3, false, false),
  ('Negociacao', '#EF4444', 4, false, false),
  ('Fechado Ganho', '#10B981', 5, true, false),
  ('Perdido', '#9CA3AF', 6, false, true)
) AS stage(name, color, position, is_won_stage, is_lost_stage)
WHERE NOT EXISTS (
  SELECT 1 FROM funnel_stages WHERE funnel_id = '00000000-0000-0000-0000-000000000001'::uuid
);
