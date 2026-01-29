-- ================================================
-- MIGRATION 002 (FIXED): Melhorias do Sistema Clawd
-- Data: 28/01/2026
-- Descrição: Adiciona notificações, agendamentos, 
--            simulações e follow-ups
-- ================================================

-- ================================================
-- 1. TABELA DE NOTIFICAÇÕES
-- ================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corretor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- novo_lead, lead_aqueceu, visitou, comprou, agendamento_proximo
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  link_acao VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_corretor ON notificacoes(corretor_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lead ON notificacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created ON notificacoes(created_at DESC);

COMMENT ON TABLE notificacoes IS 'Notificações para corretores sobre leads e ações';
COMMENT ON COLUMN notificacoes.tipo IS 'Tipo: novo_lead, lead_aqueceu, visitou, comprou, agendamento_proximo';
COMMENT ON COLUMN notificacoes.metadata IS 'Dados adicionais em JSON (score, valor_imovel, etc)';

-- ================================================
-- 2. TABELA DE AGENDAMENTOS
-- ================================================
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  corretor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_telefone VARCHAR(20) NOT NULL,
  cliente_email VARCHAR(255),
  
  -- Detalhes do imóvel
  imovel_id VARCHAR(50),
  imovel_nome VARCHAR(255),
  imovel_endereco TEXT,
  
  -- Detalhes do agendamento
  data_visita TIMESTAMP WITH TIME ZONE NOT NULL,
  duracao_minutos INTEGER DEFAULT 60,
  status VARCHAR(50) DEFAULT 'pendente', -- pendente, confirmado, realizado, cancelado, reagendado
  
  -- Confirmação e lembretes
  confirmado BOOLEAN DEFAULT FALSE,
  confirmado_em TIMESTAMP WITH TIME ZONE,
  lembrete_enviado BOOLEAN DEFAULT FALSE,
  lembrete_enviado_em TIMESTAMP WITH TIME ZONE,
  
  -- Observações
  notas TEXT,
  motivo_cancelamento TEXT,
  
  -- Google Calendar
  google_calendar_event_id VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_lead ON agendamentos(lead_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_corretor ON agendamentos(corretor_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_visita);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_confirmado ON agendamentos(confirmado);

COMMENT ON TABLE agendamentos IS 'Agendamentos de visitas a imóveis';
COMMENT ON COLUMN agendamentos.status IS 'Status: pendente, confirmado, realizado, cancelado, reagendado';
COMMENT ON COLUMN agendamentos.metadata IS 'Dados extras (localização, tipo_visita, etc)';

-- ================================================
-- 3. TABELA DE FOLLOW-UPS
-- ================================================
CREATE TABLE IF NOT EXISTS followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  corretor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Tipo de follow-up
  tipo VARCHAR(50) NOT NULL, -- automatico, manual, pos_visita, pos_simulacao
  
  -- Mensagem
  mensagem TEXT NOT NULL,
  template_usado VARCHAR(100),
  
  -- Timing
  agendado_para TIMESTAMP WITH TIME ZONE,
  enviado_em TIMESTAMP WITH TIME ZONE,
  proximo_followup TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(50) DEFAULT 'agendado', -- agendado, enviado, respondido, expirado
  
  -- Resposta
  respondeu BOOLEAN DEFAULT FALSE,
  resposta TEXT,
  respondido_em TIMESTAMP WITH TIME ZONE,
  
  -- Canal
  canal VARCHAR(50) DEFAULT 'whatsapp', -- whatsapp, email, telefone, sms
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_lead ON followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_corretor ON followups(corretor_id);
CREATE INDEX IF NOT EXISTS idx_followups_agendado ON followups(agendado_para);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_respondeu ON followups(respondeu);

COMMENT ON TABLE followups IS 'Follow-ups automáticos e manuais com leads';
COMMENT ON COLUMN followups.tipo IS 'Tipo: automatico, manual, pos_visita, pos_simulacao';
COMMENT ON COLUMN followups.canal IS 'Canal: whatsapp, email, telefone, sms';

-- ================================================
-- 4. TABELA DE SIMULAÇÕES FINANCEIRAS
-- ================================================
CREATE TABLE IF NOT EXISTS simulacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  corretor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Dados do imóvel
  imovel_id VARCHAR(50),
  imovel_nome VARCHAR(255),
  
  -- Valores
  valor_imovel DECIMAL(12,2) NOT NULL,
  entrada DECIMAL(12,2) NOT NULL,
  entrada_percentual DECIMAL(5,2),
  
  -- Financiamento
  valor_financiado DECIMAL(12,2) NOT NULL,
  taxa_juros DECIMAL(5,2) NOT NULL,
  prazo_meses INTEGER NOT NULL,
  
  -- Resultado
  parcela_mensal DECIMAL(12,2) NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL,
  juros_totais DECIMAL(12,2),
  
  -- Envio
  enviada_whatsapp BOOLEAN DEFAULT FALSE,
  enviada_email BOOLEAN DEFAULT FALSE,
  enviada_em TIMESTAMP WITH TIME ZONE,
  
  -- Resposta do cliente
  cliente_interessado BOOLEAN,
  feedback TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulacoes_lead ON simulacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_simulacoes_corretor ON simulacoes(corretor_id);
CREATE INDEX IF NOT EXISTS idx_simulacoes_enviada ON simulacoes(enviada_whatsapp);
CREATE INDEX IF NOT EXISTS idx_simulacoes_created ON simulacoes(created_at DESC);

COMMENT ON TABLE simulacoes IS 'Simulações financeiras enviadas para leads';
COMMENT ON COLUMN simulacoes.metadata IS 'Dados extras (banco, tabela, condições especiais)';

-- ================================================
-- 5. FUNÇÕES E TRIGGERS
-- ================================================

-- Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificacoes
DROP TRIGGER IF EXISTS update_notificacoes_updated_at ON notificacoes;
CREATE TRIGGER update_notificacoes_updated_at
  BEFORE UPDATE ON notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para agendamentos
DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON agendamentos;
CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para followups
DROP TRIGGER IF EXISTS update_followups_updated_at ON followups;
CREATE TRIGGER update_followups_updated_at
  BEFORE UPDATE ON followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para simulacoes
DROP TRIGGER IF EXISTS update_simulacoes_updated_at ON simulacoes;
CREATE TRIGGER update_simulacoes_updated_at
  BEFORE UPDATE ON simulacoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 6. VIEWS ÚTEIS
-- ================================================

-- View de notificações não lidas por corretor
CREATE OR REPLACE VIEW v_notificacoes_pendentes AS
SELECT 
  n.*,
  u.nome as corretor_nome,
  u.telefone as corretor_telefone,
  l.name as lead_nome,
  l.phone as lead_telefone
FROM notificacoes n
JOIN users u ON n.corretor_id = u.id
LEFT JOIN leads l ON n.lead_id = l.id
WHERE n.lida = FALSE
ORDER BY n.created_at DESC;

-- View de agendamentos próximos (próximas 24h)
CREATE OR REPLACE VIEW v_agendamentos_proximos AS
SELECT 
  a.*,
  u.nome as corretor_nome,
  u.telefone as corretor_telefone,
  l.name as lead_nome,
  l.phone as lead_telefone
FROM agendamentos a
JOIN users u ON a.corretor_id = u.id
JOIN leads l ON a.lead_id = l.id
WHERE a.data_visita BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
  AND a.status IN ('pendente', 'confirmado')
ORDER BY a.data_visita ASC;

-- View de follow-ups pendentes
CREATE OR REPLACE VIEW v_followups_pendentes AS
SELECT 
  f.*,
  l.name as lead_nome,
  l.phone as lead_telefone,
  l.score as lead_score,
  u.nome as corretor_nome
FROM followups f
JOIN leads l ON f.lead_id = l.id
LEFT JOIN users u ON f.corretor_id = u.id
WHERE f.status = 'agendado'
  AND f.agendado_para <= NOW()
ORDER BY f.agendado_para ASC;

-- ================================================
-- 7. GRANTS (OPCIONAL - AJUSTAR CONFORME NECESSÁRIO)
-- ================================================

-- GRANT ALL ON notificacoes TO pratica_app_role;
-- GRANT ALL ON agendamentos TO pratica_app_role;
-- GRANT ALL ON followups TO pratica_app_role;
-- GRANT ALL ON simulacoes TO pratica_app_role;

-- ================================================
-- FIM DA MIGRATION 002 (FIXED)
-- ================================================
