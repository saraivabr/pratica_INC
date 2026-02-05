-- ============================================================================
-- Migration 029: Disparador Inteligente
-- Ferramenta para corretores enviarem mensagens personalizadas via WhatsApp
-- para leads em massa, com IA gerando mensagens únicas e delays humanizados
-- ============================================================================

-- Tabela principal de disparos
CREATE TABLE IF NOT EXISTS disparos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL,
  user_id UUID NOT NULL,
  corretor_cvcrm_id INTEGER,
  tipo VARCHAR(50) NOT NULL,              -- follow_up, novidade, convite, livre
  intencao TEXT NOT NULL,
  filtros JSONB NOT NULL DEFAULT '{}',
  instance_name VARCHAR(255) NOT NULL,
  total_leads INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'rascunho',  -- rascunho, enviando, concluido, cancelado, falhou
  error_log JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de leads individuais de cada disparo
CREATE TABLE IF NOT EXISTS disparo_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disparo_id UUID NOT NULL REFERENCES disparos(id) ON DELETE CASCADE,
  lead_id UUID,
  lead_cvcrm_id INTEGER,
  lead_nome VARCHAR(255),
  lead_telefone VARCHAR(50),
  lead_empreendimento TEXT,
  mensagem_gerada TEXT,
  status VARCHAR(20) DEFAULT 'pendente',  -- pendente, enviado, falhou
  enviado_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_disparos_workspace ON disparos(workspace_id);
CREATE INDEX IF NOT EXISTS idx_disparos_user ON disparos(user_id);
CREATE INDEX IF NOT EXISTS idx_disparos_status ON disparos(status);
CREATE INDEX IF NOT EXISTS idx_disparos_created ON disparos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disparo_leads_disparo ON disparo_leads(disparo_id);
CREATE INDEX IF NOT EXISTS idx_disparo_leads_status ON disparo_leads(status);
CREATE INDEX IF NOT EXISTS idx_disparo_leads_telefone ON disparo_leads(lead_telefone);
CREATE INDEX IF NOT EXISTS idx_disparo_leads_enviado ON disparo_leads(enviado_at);
