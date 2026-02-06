-- Migration 053: Módulo de Propostas
-- Tabelas: propostas, proposta_parcelas, proposta_documentos

-- Propostas
CREATE TABLE IF NOT EXISTS propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) NOT NULL UNIQUE,
  workspace_id INTEGER NOT NULL,
  corretor_id UUID NOT NULL REFERENCES users(id),

  -- Empreendimento/Unidade
  empreendimento_id VARCHAR(50) NOT NULL,
  empreendimento_nome VARCHAR(255) NOT NULL,
  unidade_id VARCHAR(50) NOT NULL,
  unidade_codigo VARCHAR(100),
  unidade_bloco VARCHAR(50),
  unidade_andar VARCHAR(20),
  valor_tabela NUMERIC(14,2),

  -- Cliente
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_cpf VARCHAR(14),
  cliente_telefone VARCHAR(20),
  cliente_email VARCHAR(255),

  -- Valores
  valor_total NUMERIC(14,2) NOT NULL,
  valor_ato NUMERIC(14,2) DEFAULT 0,

  -- Status & Aprovação
  status VARCHAR(20) DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','enviada','aprovada','recusada','cancelada')),
  observacoes TEXT,
  motivo_recusa TEXT,
  aprovado_por UUID REFERENCES users(id),
  aprovado_em TIMESTAMP,
  enviada_em TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Parcelas (flexível)
CREATE TABLE IF NOT EXISTS proposta_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  descricao VARCHAR(255),
  valor NUMERIC(14,2) NOT NULL,
  data_vencimento DATE,
  quantidade INTEGER DEFAULT 1,
  valor_parcela NUMERIC(14,2),
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documentos (upload local)
CREATE TABLE IF NOT EXISTS proposta_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
  categoria VARCHAR(30) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  tamanho INTEGER,
  caminho VARCHAR(500) NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_propostas_workspace ON propostas(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_propostas_corretor ON propostas(corretor_id, status);
CREATE INDEX IF NOT EXISTS idx_proposta_parcelas_proposta ON proposta_parcelas(proposta_id);
CREATE INDEX IF NOT EXISTS idx_proposta_documentos_proposta ON proposta_documentos(proposta_id);
