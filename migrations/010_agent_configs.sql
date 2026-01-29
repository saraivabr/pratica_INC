-- Migration 010: Agent Configs - Configuração de Agentes IA por Instância WhatsApp
-- Data: 2026-01-27
-- Descrição: Tabela para armazenar configurações personalizadas de agentes IA

-- ============================================================================
-- TABELA PRINCIPAL: agent_configs
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Vinculação com instância WhatsApp (Evolution API)
    instance_name VARCHAR(255) NOT NULL,

    -- Status do agente
    is_active BOOLEAN NOT NULL DEFAULT false,

    -- Personalidade
    agent_name VARCHAR(100) NOT NULL DEFAULT 'Sofia',
    agent_role VARCHAR(255) DEFAULT 'Assistente de vendas e suporte',
    personality VARCHAR(50) DEFAULT 'amigavel', -- amigavel, profissional, direto

    -- Traços de personalidade (Big Five - 0 a 100)
    trait_openness INTEGER DEFAULT 80 CHECK (trait_openness >= 0 AND trait_openness <= 100),
    trait_conscientiousness INTEGER DEFAULT 90 CHECK (trait_conscientiousness >= 0 AND trait_conscientiousness <= 100),
    trait_extraversion INTEGER DEFAULT 70 CHECK (trait_extraversion >= 0 AND trait_extraversion <= 100),
    trait_agreeableness INTEGER DEFAULT 90 CHECK (trait_agreeableness >= 0 AND trait_agreeableness <= 100),
    trait_neuroticism INTEGER DEFAULT 20 CHECK (trait_neuroticism >= 0 AND trait_neuroticism <= 100),

    -- Mensagens configuráveis
    greeting_message TEXT DEFAULT 'Olá! Sou a Sofia, assistente virtual da Pratica Incorporadora. Como posso ajudá-lo hoje?',
    fallback_message TEXT DEFAULT 'Desculpe, não entendi bem. Pode reformular sua pergunta?',
    escalation_message TEXT DEFAULT 'Vou transferir você para um atendente humano que poderá ajudá-lo melhor.',
    out_of_hours_message TEXT DEFAULT 'Nosso atendimento funciona de segunda a sexta, das 8h às 18h. Deixe sua mensagem que retornaremos assim que possível!',

    -- Configurações de comportamento
    auto_reply BOOLEAN DEFAULT true,
    typing_delay_ms INTEGER DEFAULT 1500 CHECK (typing_delay_ms >= 0 AND typing_delay_ms <= 10000),
    max_message_length INTEGER DEFAULT 500 CHECK (max_message_length >= 50 AND max_message_length <= 2000),

    -- Horário de funcionamento
    business_hours_only BOOLEAN DEFAULT false,
    business_hours_start TIME DEFAULT '08:00',
    business_hours_end TIME DEFAULT '18:00',
    business_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 0=Dom, 1=Seg, ..., 6=Sáb

    -- Escalação para humano
    escalation_keywords TEXT[] DEFAULT ARRAY['gerente', 'humano', 'atendente', 'reclamação', 'problema grave'],
    escalation_frustration_threshold INTEGER DEFAULT 7 CHECK (escalation_frustration_threshold >= 1 AND escalation_frustration_threshold <= 10),

    -- Features avançadas
    use_psychological_analysis BOOLEAN DEFAULT false,
    use_proactive_messages BOOLEAN DEFAULT false,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Constraint de unicidade: uma config por tenant + instância
    UNIQUE(tenant_id, instance_name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_configs_tenant ON agent_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_configs_instance ON agent_configs(instance_name);
CREATE INDEX IF NOT EXISTS idx_agent_configs_active ON agent_configs(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_configs_tenant_instance ON agent_configs(tenant_id, instance_name);

-- ============================================================================
-- TRIGGER PARA UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_agent_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_configs_updated_at ON agent_configs;
CREATE TRIGGER trigger_agent_configs_updated_at
    BEFORE UPDATE ON agent_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_configs_updated_at();

-- ============================================================================
-- TABELA DE LOGS DE CONVERSAS DO AGENTE
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_conversation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    agent_config_id UUID REFERENCES agent_configs(id) ON DELETE SET NULL,

    -- Identificação da conversa
    instance_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    lead_id INTEGER, -- Se vinculado a um lead
    session_id UUID, -- Agrupar mensagens da mesma sessão

    -- Mensagem recebida
    message_received TEXT,
    message_type VARCHAR(20) DEFAULT 'text', -- text, audio, image, etc

    -- Análise da IA
    intent_detected VARCHAR(100),
    intent_confidence DECIMAL(5,2),
    sentiment VARCHAR(20), -- positivo, neutro, negativo
    frustration_level INTEGER CHECK (frustration_level >= 0 AND frustration_level <= 10),

    -- Resposta gerada
    response_generated TEXT,
    response_sent BOOLEAN DEFAULT false,
    response_time_ms INTEGER,

    -- Escalação
    was_escalated BOOLEAN DEFAULT false,
    escalation_reason VARCHAR(255),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para logs
CREATE INDEX IF NOT EXISTS idx_agent_logs_tenant ON agent_conversation_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_phone ON agent_conversation_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session ON agent_conversation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_conversation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_intent ON agent_conversation_logs(intent_detected);

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE agent_configs IS 'Configurações de agentes IA por instância WhatsApp';
COMMENT ON COLUMN agent_configs.instance_name IS 'Nome da instância Evolution API';
COMMENT ON COLUMN agent_configs.personality IS 'Tipo de personalidade: amigavel, profissional, direto';
COMMENT ON COLUMN agent_configs.business_days IS 'Dias da semana (0=Dom, 1=Seg, ..., 6=Sáb)';
COMMENT ON COLUMN agent_configs.escalation_frustration_threshold IS 'Nível de frustração (1-10) para escalar para humano';

COMMENT ON TABLE agent_conversation_logs IS 'Logs de conversas processadas pelo agente IA';
COMMENT ON COLUMN agent_conversation_logs.session_id IS 'ID para agrupar mensagens de uma mesma conversa';
