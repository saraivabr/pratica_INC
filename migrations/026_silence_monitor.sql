-- Migration 026: Silence Monitor for Recupera Leads
-- Adds silence-related columns to conversations
-- Uses existing salva_leads_config.settings JSONB for per-broker config

-- Add silence-related columns to conversations
ALTER TABLE salva_leads_conversations
  ADD COLUMN IF NOT EXISTS silence_takeover BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS silence_takeover_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS corretor_resumed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS luna_summary TEXT,
  ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50) DEFAULT 'reactivation';
  -- trigger_type: 'reactivation' (proactive daily), 'silence_takeover' (silence monitor), 'manual'

-- Index for finding silence takeover conversations
CREATE INDEX IF NOT EXISTS idx_slc_silence_takeover 
  ON salva_leads_conversations(silence_takeover, status) 
  WHERE silence_takeover = true;

-- Ensure settings JSONB has defaults for silence monitor
-- Example settings: { "silence_timeout_minutes": 10, "business_hours_start": 8, "business_hours_end": 20, "assistant_name": "Luna", "auto_assistant_enabled": true }
COMMENT ON COLUMN salva_leads_config.settings IS 'JSONB config including: silence_timeout_minutes, business_hours_start, business_hours_end, assistant_name, auto_assistant_enabled, total_interventions, total_leads_saved';
