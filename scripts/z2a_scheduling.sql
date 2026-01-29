-- ============================================
-- Z2A UPGRADE - SMART SCHEDULING (AGENDA)
-- ============================================

-- 1. Activities Table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Assigned Agent
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_type VARCHAR(50) NOT NULL, -- 'visita', 'reuniao', 'follow_up', 'ligacao'
  
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
  
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_scheduled ON activities(scheduled_at);

-- 2. Seed some activities
INSERT INTO activities (lead_id, user_id, title, activity_type, scheduled_at, priority)
SELECT 
  id as lead_id, 
  user_id, 
  'Apresentação de Projeto' as title, 
  'visita' as activity_type,
  NOW() + interval '1 day' as scheduled_at,
  'high' as priority
FROM leads
LIMIT 3;

-- 3. Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for activities" ON activities FOR ALL USING (true);
