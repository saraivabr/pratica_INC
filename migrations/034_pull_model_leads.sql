-- Migration 034: Pull Model Leads
-- Pool de leads para distribuição pull + tabela de anotações
-- Data: 2026-02-06

BEGIN;

-- 1. Tabela de anotações por atribuição
CREATE TABLE IF NOT EXISTS lead_anotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  atribuicao_id UUID REFERENCES recepcao_atribuicoes(id) ON DELETE CASCADE,
  cvcrm_lead_id INTEGER,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo VARCHAR(30) DEFAULT 'nota',
  conteudo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. View de leads disponíveis para distribuição pull
-- Drop existing view (had different column schema)
DROP VIEW IF EXISTS v_leads_para_distribuir;
CREATE VIEW v_leads_para_distribuir AS
  -- Sem corretor
  SELECT id, cvcrm_id, nome, telefone, celular, email, origem,
         situacao_nome, workspace_id, created_at, 'sem_corretor' as motivo,
         EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS horas_aguardando
  FROM cvcrm_leads
  WHERE corretor_id IS NULL
    AND situacao_nome NOT IN ('Perdido','Descartado','Cancelado','Venda Realizada','Inativo','Fechado')
    AND NOT EXISTS (
      SELECT 1 FROM recepcao_atribuicoes ra
      WHERE ra.cvcrm_lead_id = cvcrm_leads.cvcrm_id
        AND ra.atribuido_at > NOW() - INTERVAL '48 hours'
    )
  UNION ALL
  -- Abandonados (com corretor, sem atividade 7+ dias)
  SELECT id, cvcrm_id, nome, telefone, celular, email, origem,
         situacao_nome, workspace_id, created_at, 'abandonado' as motivo,
         EXTRACT(EPOCH FROM (NOW() - COALESCE(ultima_data_conversao, created_at)))/3600 AS horas_aguardando
  FROM cvcrm_leads
  WHERE corretor_id IS NOT NULL
    AND COALESCE(ultima_data_conversao, created_at) < NOW() - INTERVAL '7 days'
    AND situacao_nome IN ('Aguardando Atendimento Corretor','Aguardando Atendimento','Em Atendimento')
    AND NOT EXISTS (
      SELECT 1 FROM recepcao_atribuicoes ra
      WHERE ra.cvcrm_lead_id = cvcrm_leads.cvcrm_id
        AND ra.atribuido_at > NOW() - INTERVAL '48 hours'
    );

-- 3. Índices para performance com 30+ corretores
CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_distribuicao
  ON cvcrm_leads(corretor_id, situacao_nome)
  WHERE situacao_nome NOT IN ('Perdido','Descartado','Cancelado','Venda Realizada');

CREATE INDEX IF NOT EXISTS idx_cvcrm_leads_abandono
  ON cvcrm_leads(ultima_data_conversao)
  WHERE corretor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_atribuicoes_cvcrm_lead
  ON recepcao_atribuicoes(cvcrm_lead_id, atribuido_at);

CREATE INDEX IF NOT EXISTS idx_lead_anotacoes_atribuicao
  ON lead_anotacoes(atribuicao_id);

CREATE INDEX IF NOT EXISTS idx_lead_anotacoes_user
  ON lead_anotacoes(user_id, created_at DESC);

COMMIT;
