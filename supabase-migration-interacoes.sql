-- ============================================
-- MIGRATION: Tabela de Interações de Compartilhamento
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Tabela: interacoes (histórico detalhado de compartilhamentos)
CREATE TABLE IF NOT EXISTS interacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Quem compartilhou
  corretor_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- O que foi compartilhado
  empreendimento_id TEXT NOT NULL,
  empreendimento_nome TEXT,
  tipo_material VARCHAR(50) NOT NULL, -- 'book', 'condicoes', 'espelho', 'simulacao', 'resumo', 'unidade', 'comparacao'

  -- Para quem foi compartilhado
  lead_nome TEXT,
  lead_telefone TEXT,
  lead_id UUID, -- se vincular com sistema de leads futuro

  -- Contexto do compartilhamento
  unidade_id TEXT, -- se for compartilhamento de unidade específica
  simulacao_data JSONB, -- se for simulação, dados do cálculo
  notas_internas TEXT, -- anotações do corretor (não vão no WhatsApp)
  mensagem_enviada TEXT, -- conteúdo da mensagem enviada

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_interacoes_corretor ON interacoes(corretor_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_empreendimento ON interacoes(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_lead_telefone ON interacoes(lead_telefone);
CREATE INDEX IF NOT EXISTS idx_interacoes_created ON interacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interacoes_tipo ON interacoes(tipo_material);

-- Enable RLS
ALTER TABLE interacoes ENABLE ROW LEVEL SECURITY;

-- Política permissiva para acesso via API
CREATE POLICY "Allow all for interacoes" ON interacoes FOR ALL USING (true);

-- Comentários para documentação
COMMENT ON TABLE interacoes IS 'Histórico de compartilhamentos de materiais via WhatsApp pelos corretores';
COMMENT ON COLUMN interacoes.tipo_material IS 'Tipo de material: book, condicoes, espelho, simulacao, resumo, unidade, comparacao';
COMMENT ON COLUMN interacoes.notas_internas IS 'Anotações privadas do corretor, não são enviadas no WhatsApp';
COMMENT ON COLUMN interacoes.simulacao_data IS 'JSON com dados da simulação financeira (se aplicável)';
