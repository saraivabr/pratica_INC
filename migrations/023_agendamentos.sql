-- =============================================================================
-- Migration: 023_agendamentos.sql
-- Descrição: Criar tabela de agendamentos de visitas
-- Data: 28 Jan 2026
-- =============================================================================

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  
  -- Multi-tenant
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Relacionamentos
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  empreendimento_id INTEGER,
  unidade_id INTEGER,
  
  -- Dados do agendamento
  data_agendamento TIMESTAMP NOT NULL,
  tipo VARCHAR(50) DEFAULT 'visita',
  -- visita | reuniao | apresentacao | outro
  
  status VARCHAR(50) DEFAULT 'agendado',
  -- agendado | confirmado | realizado | cancelado | remarcado
  
  -- Detalhes
  observacoes TEXT,
  endereco TEXT,
  duracao_estimada INTEGER, -- em minutos
  
  -- Confirmação
  confirmado BOOLEAN DEFAULT false,
  confirmado_em TIMESTAMP,
  
  -- Cancelamento/Remarcação
  cancelado_em TIMESTAMP,
  motivo_cancelamento TEXT,
  remarcado_para TIMESTAMP,
  
  -- Resultado (após realização)
  realizado_em TIMESTAMP,
  resultado VARCHAR(50),
  -- interessado | proposta | venda | sem_interesse | nao_compareceu
  
  notas_visita TEXT,
  
  -- Controle
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agendamentos_tenant ON agendamentos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_lead ON agendamentos(lead_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_user ON agendamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_empreendimento ON agendamentos(empreendimento_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON agendamentos;
CREATE TRIGGER update_agendamentos_updated_at 
BEFORE UPDATE ON agendamentos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE agendamentos IS 'Agendamentos de visitas e reuniões com leads';
COMMENT ON COLUMN agendamentos.tipo IS 'Tipo de agendamento: visita, reunião, apresentação';
COMMENT ON COLUMN agendamentos.status IS 'Status: agendado, confirmado, realizado, cancelado, remarcado';
COMMENT ON COLUMN agendamentos.resultado IS 'Resultado após realização: interessado, proposta, venda, sem_interesse, nao_compareceu';
