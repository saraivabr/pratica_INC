-- Migration 005: Evolution WhatsApp Integration
-- Data: 2026-01-17
-- Tabelas para armazenar mensagens e dados WhatsApp

-- ============================================================================
-- WHATSAPP MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    tenant_id INTEGER NOT NULL,

    -- Instância Evolution
    instance_name VARCHAR(100) NOT NULL,

    -- Dados da mensagem
    message_id VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),

    -- Conteúdo
    message_type VARCHAR(50), -- conversation, imageMessage, videoMessage, etc
    message_text TEXT,
    media_url TEXT,
    caption TEXT,

    -- Direção
    is_from_me BOOLEAN DEFAULT FALSE,

    -- Status (para mensagens enviadas)
    status VARCHAR(50), -- pending, sent, delivered, read, failed
    error_message TEXT,

    -- Timestamp
    timestamp TIMESTAMP NOT NULL,

    -- Dados brutos da Evolution API
    raw_data JSONB,

    -- Relacionamento com leads (opcional)
    lead_id INTEGER,
    matched_at TIMESTAMP,

    -- Controle
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Foreign keys
    CONSTRAINT fk_whatsapp_messages_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_whatsapp_messages_lead
        FOREIGN KEY (tenant_id, lead_id) REFERENCES cvcrm_leads(tenant_id, idlead) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON whatsapp_messages(instance_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead ON whatsapp_messages(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_me ON whatsapp_messages(is_from_me);

-- Trigger
CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WHATSAPP CONTACTS (cache)
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    tenant_id INTEGER NOT NULL,

    -- Dados do contato
    phone_number VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    profile_picture_url TEXT,

    -- Status
    is_business BOOLEAN DEFAULT FALSE,
    is_group BOOLEAN DEFAULT FALSE,

    -- Relacionamento com lead
    lead_id INTEGER,
    matched_at TIMESTAMP,

    -- Estatísticas
    total_messages_received INTEGER DEFAULT 0,
    total_messages_sent INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    last_interaction_at TIMESTAMP,

    -- Controle
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Foreign keys
    CONSTRAINT fk_whatsapp_contacts_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_whatsapp_contacts_lead
        FOREIGN KEY (tenant_id, lead_id) REFERENCES cvcrm_leads(tenant_id, idlead) ON DELETE SET NULL,

    -- Unique per tenant
    CONSTRAINT unique_contact_per_tenant UNIQUE (tenant_id, phone_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant ON whatsapp_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_lead ON whatsapp_contacts(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_last_message ON whatsapp_contacts(last_message_at DESC);

-- Trigger
CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON whatsapp_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- WHATSAPP CAMPAIGNS (para depois)
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    tenant_id INTEGER NOT NULL,

    -- Campanha
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instance_name VARCHAR(100) NOT NULL,

    -- Mensagem
    message_template TEXT NOT NULL,
    media_url TEXT,

    -- Público-alvo
    target_filter JSONB, -- {score: {$gte: 70}, situacao_id: 2}
    total_targets INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, running, completed, failed
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Estatísticas
    messages_sent INTEGER DEFAULT 0,
    messages_delivered INTEGER DEFAULT 0,
    messages_read INTEGER DEFAULT 0,
    messages_replied INTEGER DEFAULT 0,
    messages_failed INTEGER DEFAULT 0,

    -- Controle
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Foreign key
    CONSTRAINT fk_whatsapp_campaigns_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_tenant ON whatsapp_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_status ON whatsapp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_scheduled ON whatsapp_campaigns(scheduled_at);

-- Trigger
CREATE TRIGGER update_whatsapp_campaigns_updated_at BEFORE UPDATE ON whatsapp_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE whatsapp_messages IS 'Mensagens WhatsApp recebidas/enviadas via Evolution API';
COMMENT ON TABLE whatsapp_contacts IS 'Cache de contatos WhatsApp com auto-match para leads';
COMMENT ON TABLE whatsapp_campaigns IS 'Campanhas de envio em massa via WhatsApp';

COMMENT ON COLUMN whatsapp_messages.raw_data IS 'Dados brutos da Evolution API (JSON completo)';
COMMENT ON COLUMN whatsapp_contacts.matched_at IS 'Quando foi feito match automático com lead';
COMMENT ON COLUMN whatsapp_campaigns.target_filter IS 'Filtro JSONB para selecionar leads alvo';
