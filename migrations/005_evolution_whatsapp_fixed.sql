-- Migration 005: Evolution WhatsApp Integration (FIXED)
-- Data: 2026-01-28
-- Tabelas para armazenar mensagens e dados WhatsApp

-- ============================================================================
-- WHATSAPP INSTANCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id SERIAL PRIMARY KEY,
    
    -- Multi-tenant
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados da instância Evolution
    instance_name VARCHAR(100) NOT NULL UNIQUE,
    instance_id VARCHAR(100),
    
    -- Status
    status VARCHAR(50) DEFAULT 'disconnected',
    -- disconnected | connecting | connected | qr_code | error
    
    qr_code TEXT,
    qr_code_updated_at TIMESTAMP,
    
    -- Dados da conexão
    phone_number VARCHAR(50),
    phone_name VARCHAR(255),
    connected_at TIMESTAMP,
    last_seen_at TIMESTAMP,
    
    -- Webhook
    webhook_url TEXT,
    
    -- Configurações
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Controle
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant ON whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user ON whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_phone ON whatsapp_instances(phone_number);

-- ============================================================================
-- WHATSAPP MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

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

    -- Relacionamento com leads (opcional - UUID agora)
    lead_id UUID REFERENCES leads(id),
    matched_at TIMESTAMP,

    -- Controle
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance ON whatsapp_messages(instance_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id ON whatsapp_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead ON whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);

-- Unique constraint para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_unique 
ON whatsapp_messages(instance_name, message_id);

-- ============================================================================
-- WHATSAPP CONTACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Instância Evolution
    instance_name VARCHAR(100) NOT NULL,

    -- Dados do contato
    phone_number VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    profile_picture_url TEXT,

    -- Relacionamento com lead (opcional - UUID agora)
    lead_id UUID REFERENCES leads(id),
    matched_at TIMESTAMP,

    -- Estatísticas
    last_message_at TIMESTAMP,
    total_messages INTEGER DEFAULT 0,

    -- Dados brutos da Evolution API
    raw_data JSONB,

    -- Controle
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_tenant ON whatsapp_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_instance ON whatsapp_contacts(instance_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON whatsapp_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_lead ON whatsapp_contacts(lead_id);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_contacts_unique 
ON whatsapp_contacts(instance_name, phone_number);

-- ============================================================================
-- WHATSAPP CAMPAIGNS (já existe, skip)
-- ============================================================================

-- Já foi criado em outra migração

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_updated_at 
BEFORE UPDATE ON whatsapp_instances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER update_whatsapp_messages_updated_at 
BEFORE UPDATE ON whatsapp_messages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_contacts_updated_at ON whatsapp_contacts;
CREATE TRIGGER update_whatsapp_contacts_updated_at 
BEFORE UPDATE ON whatsapp_contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE whatsapp_instances IS 'Instâncias Evolution API conectadas (uma por usuário/corretor)';
COMMENT ON TABLE whatsapp_messages IS 'Histórico completo de mensagens WhatsApp';
COMMENT ON TABLE whatsapp_contacts IS 'Contatos WhatsApp com estatísticas';

COMMENT ON COLUMN whatsapp_messages.lead_id IS 'Relacionamento opcional com lead do sistema';
COMMENT ON COLUMN whatsapp_contacts.lead_id IS 'Relacionamento opcional com lead do sistema';
