-- ============================================
-- SALVA-LEADS SCHEMA
-- ============================================

-- Tabela de Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id INTEGER NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  whatsapp VARCHAR(20) NOT NULL,
  imovel_id VARCHAR(255),
  imovel_nome VARCHAR(255),
  imovel_preco DECIMAL(12, 2),
  filtros JSONB DEFAULT '{}',
  score DECIMAL(3, 1) DEFAULT 0,
  qualificado BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'novo', -- novo, em_contato, agendado, visitou, fechado, descartado
  corretor_id UUID,
  source VARCHAR(100) DEFAULT 'whatsapp_sofia', -- whatsapp_sofia, website, etc
  cvcrm_lead_id INTEGER, -- ID do lead no CV CRM
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (corretor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_status (status),
  INDEX idx_score (score),
  INDEX idx_qualificado (qualificado),
  INDEX idx_corretor_id (corretor_id),
  INDEX idx_created_at (created_at)
);

-- Tabela de Interações do Lead
CREATE TABLE IF NOT EXISTS leads_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  tenant_id INTEGER NOT NULL,
  tipo VARCHAR(100) NOT NULL, -- mensagem, visualizacao, chamada, contato, agendamento_visita, follow_up_enviado
  descricao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_lead_id (lead_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_tipo (tipo),
  INDEX idx_created_at (created_at)
);

-- Tabela de Visitas Agendadas
CREATE TABLE IF NOT EXISTS leads_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  tenant_id INTEGER NOT NULL,
  scheduled_date TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'agendada', -- agendada, realizada, cancelada, remarcada
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_lead_id (lead_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_status (status),
  INDEX idx_scheduled_date (scheduled_date)
);

-- Tabela de Follow-up (histórico)
CREATE TABLE IF NOT EXISTS leads_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL,
  tenant_id INTEGER NOT NULL,
  tipo VARCHAR(100) NOT NULL, -- primeira_mensagem, segunda_mensagem, etc
  status VARCHAR(50) DEFAULT 'enviado', -- pendente, enviado, falhou
  proxima_data TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_lead_id (lead_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_status (status),
  INDEX idx_proxima_data (proxima_data)
);

-- ============================================
-- ÍNDICES COMPOSTOS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_tenant_status 
  ON leads(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_score 
  ON leads(tenant_id, score DESC);

CREATE INDEX IF NOT EXISTS idx_leads_tenant_created 
  ON leads(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_interactions_lead_type
  ON leads_interactions(lead_id, tipo);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Atualizar updated_at em leads
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_timestamp
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Atualizar updated_at em leads_visits
CREATE TRIGGER update_leads_visits_timestamp
  BEFORE UPDATE ON leads_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Atualizar updated_at em leads_followups  
CREATE TRIGGER update_leads_followups_timestamp
  BEFORE UPDATE ON leads_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- ============================================
-- VIEW PARA LEADS COM DADOS AGREGADOS
-- ============================================

CREATE OR REPLACE VIEW leads_with_stats AS
SELECT 
  l.*,
  COUNT(DISTINCT i.id) as interaction_count,
  COUNT(DISTINCT v.id) as visit_count,
  MAX(i.created_at) as last_interaction,
  MAX(v.scheduled_date) as next_visit
FROM leads l
LEFT JOIN leads_interactions i ON l.id = i.lead_id
LEFT JOIN leads_visits v ON l.id = v.lead_id AND v.status = 'agendada'
GROUP BY l.id;
