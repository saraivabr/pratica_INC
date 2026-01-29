-- ============================================
-- PARCERIA IMÓVEIS - Schema do Banco de Dados
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Tabela: imobiliarias (empresas)
-- ============================================
CREATE TABLE IF NOT EXISTS imobiliarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir Orcioli como imobiliária padrão (para autônomos)
INSERT INTO imobiliarias (id, nome, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Orcioli Realizando Sonhos', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Tabela: users (gerentes e corretores)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefone VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,

  -- Hierarquia
  role VARCHAR(20) NOT NULL DEFAULT 'corretor', -- 'admin', 'gerente', 'corretor'
  imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE SET NULL,
  gerente_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Status
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  onboarding_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'invited', 'completed'
  invited_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Index para busca
CREATE INDEX IF NOT EXISTS idx_users_telefone ON users(telefone);
CREATE INDEX IF NOT EXISTS idx_users_imobiliaria ON users(imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_users_gerente ON users(gerente_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- Tabela: share_views (rastreamento de compartilhamento)
-- ============================================
CREATE TABLE IF NOT EXISTS share_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empreendimento_id TEXT NOT NULL,
  corretor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_views_emp ON share_views(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_share_views_corretor ON share_views(corretor_id);

-- ============================================
-- Tabela: sessions (sessões de login)
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  otp_code VARCHAR(255),
  otp_expires_at TIMESTAMP WITH TIME ZONE,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index para validação de sessão
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_verified ON sessions(is_verified, expires_at);

-- ============================================
-- Tabela: tracking_events (rastreamento)
-- ============================================
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  page VARCHAR(255) NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para consultas de atividade
CREATE INDEX IF NOT EXISTS idx_tracking_user ON tracking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_created ON tracking_events(created_at DESC);

-- ============================================
-- Tabela: conversations (conversas WhatsApp IA)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para busca de conversas
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- ============================================
-- Tabela: whatsapp_queue (fila de mensagens)
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  message_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Index para processamento de fila
CREATE INDEX IF NOT EXISTS idx_queue_status ON whatsapp_queue(status, created_at);

-- ============================================
-- Tabela: whatsapp_sessions (multi-tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'disconnected', -- connecting | qr | ready | disconnected | error
  paired_phone VARCHAR(32),
  device_name TEXT,
  session_data TEXT, -- JSON criptografado/base64
  last_qr TEXT,
  last_qr_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  error_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_sessions_user ON whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_tenant ON whatsapp_sessions(imobiliaria_id);

-- ============================================
-- Tabela: materials (PDFs temporários)
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content BYTEA NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_expires ON materials(expires_at);

-- ============================================
-- Tabela: material_sends (log de envios)
-- ============================================
CREATE TABLE IF NOT EXISTS material_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  empreendimento_id TEXT NOT NULL,
  type VARCHAR(20) NOT NULL,
  pdf_url TEXT,
  landing_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_sends_user ON material_sends(user_id);

-- ============================================
-- Tabela: inbound_messages (dedupe de mensagens)
-- ============================================
CREATE TABLE IF NOT EXISTS inbound_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_messages_phone ON inbound_messages(phone);

-- ============================================
-- Tabela: conversation_locks (controle de concorrência)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_locks_phone ON conversation_locks(phone);
CREATE INDEX IF NOT EXISTS idx_conversation_locks_until ON conversation_locks(locked_until);

-- ============================================
-- Tabela: shared_contacts (contatos compartilhados por gerente)
-- ============================================
CREATE TABLE IF NOT EXISTS shared_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- pending | completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_contacts_manager ON shared_contacts(manager_id);
CREATE INDEX IF NOT EXISTS idx_shared_contacts_phone ON shared_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_shared_contacts_status ON shared_contacts(status);

-- ============================================
-- Tabela: onboarding_leads (cadastro via WhatsApp)
-- ============================================
CREATE TABLE IF NOT EXISTS onboarding_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  imobiliaria_name VARCHAR(255),
  imobiliaria_id UUID REFERENCES imobiliarias(id) ON DELETE SET NULL,
  gerente_name VARCHAR(255),
  gerente_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'collecting', -- collecting | ready | created
  step VARCHAR(30) DEFAULT 'name', -- name | confirm_name | imobiliaria | confirm_imobiliaria | gerente | done
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_leads_phone ON onboarding_leads(phone);
CREATE INDEX IF NOT EXISTS idx_onboarding_leads_status ON onboarding_leads(status);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_recovery_logs ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para acesso anônimo (via API)
-- Em produção, ajustar conforme necessário

CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all for tracking" ON tracking_events FOR ALL USING (true);
CREATE POLICY "Allow all for conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow all for queue" ON whatsapp_queue FOR ALL USING (true);
CREATE POLICY "Allow all for whatsapp_sessions" ON whatsapp_sessions FOR ALL USING (true);
CREATE POLICY "Allow all for share_views" ON share_views FOR ALL USING (true);
CREATE POLICY "Allow all for materials" ON materials FOR ALL USING (true);
CREATE POLICY "Allow all for material_sends" ON material_sends FOR ALL USING (true);
CREATE POLICY "Allow all for onboarding leads" ON onboarding_leads FOR ALL USING (true);
CREATE POLICY "Allow all for inbound messages" ON inbound_messages FOR ALL USING (true);
CREATE POLICY "Allow all for conversation locks" ON conversation_locks FOR ALL USING (true);
CREATE POLICY "Allow all for shared contacts" ON shared_contacts FOR ALL USING (true);
CREATE POLICY "Allow all for lead recovery logs" ON lead_recovery_logs FOR ALL USING (true);
CREATE POLICY "Allow all for cvcrm_snapshots" ON cvcrm_snapshots FOR ALL USING (true);

-- ============================================
-- Tabela: lead_recovery_logs (auditoria de mensagens de recuperação)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_recovery_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  atendimento_id UUID,
  corretor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  phone VARCHAR(32) NOT NULL,
  cliente_nome VARCHAR(255),
  situacao VARCHAR(32),
  status VARCHAR(16), -- sent | skipped | error
  reason TEXT,
  message TEXT,
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_recovery_logs_atendimento ON lead_recovery_logs(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_lead_recovery_logs_phone ON lead_recovery_logs(phone);
CREATE INDEX IF NOT EXISTS idx_lead_recovery_logs_status ON lead_recovery_logs(status);

-- ============================================
-- Tabela: cvcrm_snapshots (armazenar sync offline)
-- ============================================
CREATE TABLE IF NOT EXISTS cvcrm_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  empreendimentos JSONB,
  unidades JSONB,
  unidades_situacao JSONB,
  series JSONB,
  corretores JSONB,
  leads JSONB,
  summary JSONB,
  errors JSONB
);

CREATE INDEX IF NOT EXISTS idx_cvcrm_snapshots_created_at ON cvcrm_snapshots(created_at);

-- ============================================
-- Tabela: lead_insights (detalhes de lead para IA)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  phone VARCHAR(32),
  summary TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_insights_phone ON lead_insights(phone);
CREATE INDEX IF NOT EXISTS idx_lead_insights_slug ON lead_insights(slug);

-- ============================================
-- Função para limpar sessões expiradas
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Inserir usuário admin de teste (opcional)
-- ============================================
-- INSERT INTO users (telefone, nome, imobiliaria, gerente)
-- VALUES ('+5511999999999', 'Admin Teste', 'Orcioli', 'Gerente Teste');

-- ============================================
-- PRONTO! Agora volte para o app.
-- ============================================
