-- Tabela para analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  properties JSONB,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- Tabela para rastreamento de comparações
CREATE TABLE IF NOT EXISTS property_comparisons (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  property_ids INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_comparisons_user ON property_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_property_comparisons_created_at ON property_comparisons(created_at DESC);
