-- Migration 012: Disparador de Eventos
-- Data: 2026-01-27
-- Tabelas para o módulo de disparo de eventos para corretores via WhatsApp

-- ============================================================================
-- EVENTOS
-- ============================================================================

-- Eventos criados pelo tenant
CREATE TABLE IF NOT EXISTS eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Dados do evento
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_hora TIMESTAMP NOT NULL,
    local TEXT NOT NULL,

    -- Configuração de lembrete
    lembrete_horas INTEGER DEFAULT 24, -- 1, 6, 12, 24 ou 48 horas antes

    -- Status do evento
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho', -- rascunho, ativo, finalizado, cancelado

    -- Controle
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eventos_tenant ON eventos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eventos_status ON eventos(status);
CREATE INDEX IF NOT EXISTS idx_eventos_data_hora ON eventos(data_hora);
CREATE INDEX IF NOT EXISTS idx_eventos_tenant_status ON eventos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_eventos_lembrete ON eventos(data_hora, lembrete_horas) WHERE status = 'ativo';

-- Trigger para updated_at
CREATE TRIGGER update_eventos_updated_at BEFORE UPDATE ON eventos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EVENTO CONVIDADOS
-- ============================================================================

-- Convidados de cada evento (corretores)
CREATE TABLE IF NOT EXISTS evento_convidados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Dados do convidado
    nome VARCHAR(255) NOT NULL,
    celular VARCHAR(50) NOT NULL,

    -- Origem do contato
    origem VARCHAR(20) NOT NULL DEFAULT 'importado', -- 'cvcrm' ou 'importado'
    cvcrm_id INTEGER, -- ID do corretor no CV CRM (se origem = 'cvcrm')

    -- Status da confirmação
    status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- pendente, confirmado, recusado, talvez

    -- Timestamps de interação
    convite_enviado_at TIMESTAMP, -- Quando o convite foi enviado
    lembrete_enviado_at TIMESTAMP, -- Quando o lembrete foi enviado
    confirmado_at TIMESTAMP, -- Quando o convidado respondeu

    -- Controle
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evento_convidados_evento ON evento_convidados(evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_convidados_tenant ON evento_convidados(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evento_convidados_status ON evento_convidados(status);
CREATE INDEX IF NOT EXISTS idx_evento_convidados_celular ON evento_convidados(celular);
CREATE INDEX IF NOT EXISTS idx_evento_convidados_cvcrm ON evento_convidados(cvcrm_id) WHERE cvcrm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evento_convidados_evento_status ON evento_convidados(evento_id, status);
CREATE INDEX IF NOT EXISTS idx_evento_convidados_convite_pendente ON evento_convidados(evento_id) WHERE convite_enviado_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_evento_convidados_lembrete_pendente ON evento_convidados(evento_id, status) WHERE lembrete_enviado_at IS NULL AND status IN ('confirmado', 'talvez');

-- Constraint para garantir unicidade de celular por evento
ALTER TABLE evento_convidados ADD CONSTRAINT unique_convidado_per_evento UNIQUE (evento_id, celular);

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE eventos IS 'Eventos criados para disparo de convites via WhatsApp para corretores';
COMMENT ON TABLE evento_convidados IS 'Corretores convidados para cada evento';

COMMENT ON COLUMN eventos.status IS 'rascunho, ativo, finalizado, cancelado';
COMMENT ON COLUMN eventos.lembrete_horas IS 'Quantas horas antes do evento enviar lembrete (1, 6, 12, 24 ou 48)';

COMMENT ON COLUMN evento_convidados.origem IS 'cvcrm = da base de corretores, importado = planilha Excel/CSV';
COMMENT ON COLUMN evento_convidados.cvcrm_id IS 'ID do corretor no CV CRM, preenchido somente se origem = cvcrm';
COMMENT ON COLUMN evento_convidados.status IS 'pendente, confirmado, recusado, talvez';
COMMENT ON COLUMN evento_convidados.convite_enviado_at IS 'Timestamp de quando o convite WhatsApp foi enviado';
COMMENT ON COLUMN evento_convidados.lembrete_enviado_at IS 'Timestamp de quando o lembrete foi enviado';
COMMENT ON COLUMN evento_convidados.confirmado_at IS 'Timestamp de quando o convidado respondeu (qualquer status)';
