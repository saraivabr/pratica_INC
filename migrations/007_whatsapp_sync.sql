-- Migration 007: WhatsApp Sync
-- Data: 2026-01-19
-- Tabelas para sincronizacao de conversas WhatsApp

-- ============================================================================
-- WHATSAPP SYNCED CHATS
-- ============================================================================

-- Conversas sincronizadas do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_synced_chats (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    remote_jid VARCHAR(100) NOT NULL, -- ex: 5511999999999@s.whatsapp.net
    phone_number VARCHAR(50) NOT NULL, -- numero limpo
    contact_name VARCHAR(255),
    is_group BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMP,
    last_message_text TEXT,
    last_message_from_me BOOLEAN,
    unread_count INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,

    -- Analise
    matched_lead_id VARCHAR(100), -- idlead do CV CRM se encontrado
    matched_lead_name VARCHAR(255),
    days_without_response INTEGER, -- dias sem resposta do lead
    recovery_potential VARCHAR(50), -- alto, medio, baixo, none
    suggested_message TEXT,

    -- Controle
    synced_at TIMESTAMP DEFAULT NOW(),
    analyzed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, remote_jid)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wsc_tenant ON whatsapp_synced_chats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wsc_phone ON whatsapp_synced_chats(phone_number);
CREATE INDEX IF NOT EXISTS idx_wsc_matched_lead ON whatsapp_synced_chats(matched_lead_id) WHERE matched_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wsc_recovery ON whatsapp_synced_chats(recovery_potential) WHERE recovery_potential IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wsc_days_response ON whatsapp_synced_chats(days_without_response) WHERE days_without_response IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wsc_last_message ON whatsapp_synced_chats(last_message_at);

-- Trigger
CREATE TRIGGER update_whatsapp_synced_chats_updated_at BEFORE UPDATE ON whatsapp_synced_chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WHATSAPP SYNCED CONTACTS
-- ============================================================================

-- Contatos sincronizados do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_synced_contacts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    remote_jid VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    push_name VARCHAR(255), -- nome no WhatsApp
    profile_picture_url TEXT,
    is_business BOOLEAN DEFAULT FALSE,
    matched_lead_id VARCHAR(100),
    synced_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, remote_jid)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wsct_tenant ON whatsapp_synced_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wsct_phone ON whatsapp_synced_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_wsct_matched_lead ON whatsapp_synced_contacts(matched_lead_id) WHERE matched_lead_id IS NOT NULL;

-- Trigger
CREATE TRIGGER update_whatsapp_synced_contacts_updated_at BEFORE UPDATE ON whatsapp_synced_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WHATSAPP SYNC RUNS
-- ============================================================================

-- Historico de sincronizacoes
CREATE TABLE IF NOT EXISTS whatsapp_sync_runs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id),
    status VARCHAR(50) DEFAULT 'running', -- running, completed, failed
    chats_synced INTEGER DEFAULT 0,
    contacts_synced INTEGER DEFAULT 0,
    leads_matched INTEGER DEFAULT 0,
    opportunities_found INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wsr_tenant ON whatsapp_sync_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wsr_status ON whatsapp_sync_runs(status);
CREATE INDEX IF NOT EXISTS idx_wsr_started ON whatsapp_sync_runs(started_at);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE whatsapp_synced_chats IS 'Conversas WhatsApp sincronizadas para analise de oportunidades';
COMMENT ON TABLE whatsapp_synced_contacts IS 'Contatos WhatsApp sincronizados';
COMMENT ON TABLE whatsapp_sync_runs IS 'Historico de execucoes de sincronizacao WhatsApp';

COMMENT ON COLUMN whatsapp_synced_chats.remote_jid IS 'Identificador unico do chat no WhatsApp (ex: 5511999999999@s.whatsapp.net)';
COMMENT ON COLUMN whatsapp_synced_chats.phone_number IS 'Numero de telefone limpo (apenas digitos)';
COMMENT ON COLUMN whatsapp_synced_chats.matched_lead_id IS 'idlead do CV CRM se encontrado match';
COMMENT ON COLUMN whatsapp_synced_chats.days_without_response IS 'Dias desde ultima resposta do lead';
COMMENT ON COLUMN whatsapp_synced_chats.recovery_potential IS 'Potencial de recuperacao: alto, medio, baixo, none';
COMMENT ON COLUMN whatsapp_synced_chats.suggested_message IS 'Mensagem sugerida pela IA para reengajamento';

COMMENT ON COLUMN whatsapp_synced_contacts.push_name IS 'Nome definido pelo usuario no WhatsApp';
COMMENT ON COLUMN whatsapp_synced_contacts.is_business IS 'Se e uma conta WhatsApp Business';

COMMENT ON COLUMN whatsapp_sync_runs.status IS 'running, completed, failed';
COMMENT ON COLUMN whatsapp_sync_runs.opportunities_found IS 'Quantidade de oportunidades de recuperacao identificadas';
