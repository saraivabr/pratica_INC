-- ============================================================================
-- Migration 029: CRM Automations & Notifications
-- Descrição: Sistema completo de automações e notificações para CRM
-- Data: 29 Jan 2026
-- ============================================================================

-- Função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela de configuração Salva-Leads (se não existir)
CREATE TABLE IF NOT EXISTS salva_leads_config (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instance_name VARCHAR(100),
  enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_slc_user ON salva_leads_config(user_id);
CREATE INDEX IF NOT EXISTS idx_slc_tenant ON salva_leads_config(tenant_id);

-- Trigger para updated_at
CREATE TRIGGER update_salva_leads_config_updated_at 
BEFORE UPDATE ON salva_leads_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTIFICAÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notificacoes (
  id SERIAL PRIMARY KEY,
  
  -- Multi-tenant
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id INTEGER,
  
  -- Destinatário
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Conteúdo
  tipo VARCHAR(50) NOT NULL,
  -- follow_up | lembrete | novo_lead | lead_quente | agendamento | tarefa | sistema
  
  titulo VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  
  -- Relacionamentos (opcional)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  agendamento_id INTEGER,
  
  -- Dados adicionais
  dados JSONB DEFAULT '{}',
  
  -- Controle
  lida BOOLEAN DEFAULT false,
  lida_em TIMESTAMP,
  
  -- Ação (link/rota para clicar)
  acao_url TEXT,
  acao_label VARCHAR(100),
  
  prioridade VARCHAR(20) DEFAULT 'normal',
  -- baixa | normal | alta | urgente
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para notificações
CREATE INDEX IF NOT EXISTS idx_notif_user ON notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON notificacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_workspace ON notificacoes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notif_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notif_tipo ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notificacoes(created_at DESC);

-- ============================================================================
-- AUTOMAÇÕES DE FOLLOW-UP
-- ============================================================================

CREATE TABLE IF NOT EXISTS automacoes_followup (
  id SERIAL PRIMARY KEY,
  
  -- Multi-tenant
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id INTEGER,
  
  -- Configuração
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  
  -- Trigger (quando disparar)
  trigger_tipo VARCHAR(50) NOT NULL,
  -- novo_lead | dias_sem_resposta | lead_frio | lead_quente | custom
  
  trigger_config JSONB DEFAULT '{}',
  -- Ex: { "dias": 3 } para dias_sem_resposta
  
  -- Ação (o que fazer)
  acao_tipo VARCHAR(50) NOT NULL,
  -- whatsapp | email | notificacao | webhook
  
  acao_config JSONB DEFAULT '{}',
  -- Ex: { "template": "mensagem_followup_3dias" }
  
  -- Template da mensagem
  template_mensagem TEXT,
  
  -- Estatísticas
  total_execucoes INTEGER DEFAULT 0,
  ultima_execucao TIMESTAMP,
  
  -- Controle
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_tenant ON automacoes_followup(tenant_id);
CREATE INDEX IF NOT EXISTS idx_auto_workspace ON automacoes_followup(workspace_id);
CREATE INDEX IF NOT EXISTS idx_auto_ativo ON automacoes_followup(ativo);
CREATE INDEX IF NOT EXISTS idx_auto_trigger ON automacoes_followup(trigger_tipo);

CREATE TRIGGER update_automacoes_followup_updated_at 
BEFORE UPDATE ON automacoes_followup
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LOG DE EXECUÇÃO DAS AUTOMAÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS automacoes_execucoes (
  id SERIAL PRIMARY KEY,
  
  automacao_id INTEGER REFERENCES automacoes_followup(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Resultado
  sucesso BOOLEAN DEFAULT false,
  erro_mensagem TEXT,
  
  -- Dados enviados
  dados_enviados JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autoexec_automacao ON automacoes_execucoes(automacao_id);
CREATE INDEX IF NOT EXISTS idx_autoexec_lead ON automacoes_execucoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_autoexec_created ON automacoes_execucoes(created_at DESC);

-- ============================================================================
-- LEMBRETES
-- ============================================================================

CREATE TABLE IF NOT EXISTS lembretes (
  id SERIAL PRIMARY KEY,
  
  -- Multi-tenant
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id INTEGER,
  
  -- Usuário
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Relacionamentos
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  agendamento_id INTEGER,
  
  -- Conteúdo
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  
  -- Agendamento
  data_lembrete TIMESTAMP NOT NULL,
  
  -- Controle
  processado BOOLEAN DEFAULT false,
  processado_em TIMESTAMP,
  
  -- Notificação criada
  notificacao_id INTEGER REFERENCES notificacoes(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lembrete_user ON lembretes(user_id);
CREATE INDEX IF NOT EXISTS idx_lembrete_data ON lembretes(data_lembrete);
CREATE INDEX IF NOT EXISTS idx_lembrete_processado ON lembretes(processado);
CREATE INDEX IF NOT EXISTS idx_lembrete_tenant ON lembretes(tenant_id);

-- ============================================================================
-- INSERIR AUTOMAÇÕES PADRÃO
-- ============================================================================

-- Automação 1: Novo Lead (resposta imediata)
INSERT INTO automacoes_followup (
  tenant_id,
  workspace_id,
  nome,
  descricao,
  ativo,
  trigger_tipo,
  trigger_config,
  acao_tipo,
  acao_config,
  template_mensagem
) VALUES (
  1,
  1,
  'Boas-vindas Novo Lead',
  'Mensagem automática de boas-vindas para novos leads',
  true,
  'novo_lead',
  '{"delay_minutos": 0}',
  'whatsapp',
  '{"enviar_imediatamente": true}',
  'Olá {nome}! 👋

Obrigado pelo seu interesse! Sou {corretor_nome}, corretor responsável.

Vi que você se interessou por {empreendimento}. Que tal conversarmos sobre isso?

Tem alguma dúvida que eu possa responder agora? 😊'
) ON CONFLICT DO NOTHING;

-- Automação 2: 3 Dias Sem Resposta
INSERT INTO automacoes_followup (
  tenant_id,
  workspace_id,
  nome,
  descricao,
  ativo,
  trigger_tipo,
  trigger_config,
  acao_tipo,
  acao_config,
  template_mensagem
) VALUES (
  1,
  1,
  'Follow-up 3 Dias',
  'Mensagem automática após 3 dias sem resposta do lead',
  true,
  'dias_sem_resposta',
  '{"dias": 3}',
  'whatsapp',
  '{}',
  'Oi {nome}! 👋

Tudo bem? Vi que você demonstrou interesse no {empreendimento} há alguns dias.

Ainda está interessado? Temos algumas novidades que podem te interessar! 🏡

Quando podemos conversar? 📱'
) ON CONFLICT DO NOTHING;

-- Automação 3: 7 Dias Lead Frio
INSERT INTO automacoes_followup (
  tenant_id,
  workspace_id,
  nome,
  descricao,
  ativo,
  trigger_tipo,
  trigger_config,
  acao_tipo,
  acao_config,
  template_mensagem
) VALUES (
  1,
  1,
  'Reengajamento 7 Dias',
  'Tentativa de reengajamento de leads frios (7 dias sem interação)',
  true,
  'lead_frio',
  '{"dias": 7}',
  'whatsapp',
  '{}',
  'Olá {nome}! 🎯

Sumiu, hein? 😄

Descobrimos algumas oportunidades INCRÍVEIS que combinam perfeitamente com o que você procurava!

Posso te mostrar? Acho que você vai gostar! ✨

Quando você tem um tempinho pra gente conversar?'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE notificacoes IS 'Sistema de notificações em tempo real para usuários';
COMMENT ON TABLE automacoes_followup IS 'Configuração de automações de follow-up para leads';
COMMENT ON TABLE automacoes_execucoes IS 'Log de execução das automações';
COMMENT ON TABLE lembretes IS 'Lembretes agendados pelos usuários';
COMMENT ON TABLE salva_leads_config IS 'Configuração do sistema Salva-Leads por corretor';

COMMENT ON COLUMN notificacoes.tipo IS 'follow_up, lembrete, novo_lead, lead_quente, agendamento, tarefa, sistema';
COMMENT ON COLUMN notificacoes.prioridade IS 'baixa, normal, alta, urgente';
COMMENT ON COLUMN automacoes_followup.trigger_tipo IS 'novo_lead, dias_sem_resposta, lead_frio, lead_quente, custom';
COMMENT ON COLUMN automacoes_followup.acao_tipo IS 'whatsapp, email, notificacao, webhook';
