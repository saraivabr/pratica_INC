-- Migration 006: Salva-Leads
-- Data: 2026-01-19
-- Tabelas para o módulo Salva-Leads (reengajamento de leads abandonados)

-- ============================================================================
-- SALVA-LEADS CONVERSATIONS
-- ============================================================================

-- Conversações do Salva-Leads
CREATE TABLE IF NOT EXISTS salva_leads_conversations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    atendimento_id VARCHAR(100) NOT NULL,
    lead_phone VARCHAR(50) NOT NULL,
    lead_name VARCHAR(255),
    corretor_id VARCHAR(100) NOT NULL,
    corretor_phone VARCHAR(50),

    -- Estado
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, paused_by_corretor, completed, expired
    classification VARCHAR(50), -- tem_potencial, encerrada

    -- Contexto IA
    context JSONB DEFAULT '{}',
    messages JSONB DEFAULT '[]',

    -- Debounce
    pending_messages JSONB DEFAULT '[]',
    debounce_until TIMESTAMP,

    -- Controle do bot
    bot_paused BOOLEAN DEFAULT FALSE,
    bot_paused_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, atendimento_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_slc_phone ON salva_leads_conversations(lead_phone);
CREATE INDEX IF NOT EXISTS idx_slc_status ON salva_leads_conversations(status);
CREATE INDEX IF NOT EXISTS idx_slc_debounce ON salva_leads_conversations(debounce_until) WHERE debounce_until IS NOT NULL;

-- Trigger
CREATE TRIGGER update_salva_leads_conversations_updated_at BEFORE UPDATE ON salva_leads_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SALVA-LEADS RUNS
-- ============================================================================

-- Execuções agendadas
CREATE TABLE IF NOT EXISTS salva_leads_runs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    corretor_id VARCHAR(100),
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    leads_processed INTEGER DEFAULT 0,
    leads_sent INTEGER DEFAULT 0,
    results JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_slr_tenant ON salva_leads_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_slr_status ON salva_leads_runs(status);
CREATE INDEX IF NOT EXISTS idx_slr_scheduled ON salva_leads_runs(scheduled_for);

-- ============================================================================
-- SALVA-LEADS TOOL CALLS
-- ============================================================================

-- Chamadas de ferramentas
CREATE TABLE IF NOT EXISTS salva_leads_tool_calls (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES salva_leads_conversations(id),
    tool_name VARCHAR(100) NOT NULL,
    tool_input JSONB,
    tool_output JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sltc_conversation ON salva_leads_tool_calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sltc_status ON salva_leads_tool_calls(status);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE salva_leads_conversations IS 'Conversacoes do modulo Salva-Leads para reengajamento de leads abandonados';
COMMENT ON TABLE salva_leads_runs IS 'Execucoes agendadas do Salva-Leads';
COMMENT ON TABLE salva_leads_tool_calls IS 'Chamadas de ferramentas IA nas conversacoes Salva-Leads';

COMMENT ON COLUMN salva_leads_conversations.status IS 'pending, active, paused_by_corretor, completed, expired';
COMMENT ON COLUMN salva_leads_conversations.classification IS 'tem_potencial, encerrada';
COMMENT ON COLUMN salva_leads_conversations.debounce_until IS 'Timestamp ate quando aguardar mais mensagens antes de processar';
COMMENT ON COLUMN salva_leads_conversations.bot_paused IS 'Se o bot esta pausado (corretor assumiu)';
