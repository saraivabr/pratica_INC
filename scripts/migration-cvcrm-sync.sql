-- ============================================
-- MIGRATION: Sistema de Sync com CV CRM
-- Execute este SQL no banco de dados
-- ============================================

-- ============================================
-- PARTE 1: Expandir tabela IMOBILIARIAS
-- ============================================

-- Campos de identificação CV CRM
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS cvcrm_id INTEGER UNIQUE;
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS razao_social VARCHAR(255);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS fantasia VARCHAR(255);

-- Campos de documentação
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(50);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(50);

-- Campos de endereço expandidos
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS uf VARCHAR(2);

-- Campos de contato expandidos
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS celular VARCHAR(20);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS site VARCHAR(255);

-- Campos de responsável
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(255);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS responsavel_cpf VARCHAR(20);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS responsavel_email VARCHAR(255);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS responsavel_telefone VARCHAR(20);

-- Campos de CRECI
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS creci VARCHAR(50);
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS creci_uf VARCHAR(2);

-- Metadados de sync
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS cvcrm_data JSONB;
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE imobiliarias ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Index para busca por cvcrm_id
CREATE INDEX IF NOT EXISTS idx_imobiliarias_cvcrm_id ON imobiliarias(cvcrm_id);

-- ============================================
-- PARTE 2: Expandir tabela USERS (corretores)
-- ============================================

-- Campos de identificação CV CRM
ALTER TABLE users ADD COLUMN IF NOT EXISTS cvcrm_id INTEGER UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cvcrm_imobiliaria_id INTEGER;

-- Campos pessoais
ALTER TABLE users ADD COLUMN IF NOT EXISTS apelido VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rg VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rg_orgao VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS rg_data_emissao DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS genero VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS naturalidade VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nacionalidade VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS qtd_filhos INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dependentes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tamanho_camisa VARCHAR(10);

-- Campos profissionais
ALTER TABLE users ADD COLUMN IF NOT EXISTS creci VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS creci_uf VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS creci_validade DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS categoria VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nivel VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS time VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS corretor_parceiro BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS codigo_interno VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS identificador VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cracha VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS numero_pis VARCHAR(20);

-- Campos de endereço
ALTER TABLE users ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS uf VARCHAR(2);

-- Campos de formação
ALTER TABLE users ADD COLUMN IF NOT EXISTS formacao_academica VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS curso VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ano_conclusao INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS conhecimento_office VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS conhecimento_email VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS outros_cursos TEXT;

-- Campos bancários
ALTER TABLE users ADD COLUMN IF NOT EXISTS banco VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS agencia VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS conta VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_conta VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pix VARCHAR(100);

-- Campos de observação
ALTER TABLE users ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ativo_login_cvcrm BOOLEAN;

-- Metadados de sync
ALTER TABLE users ADD COLUMN IF NOT EXISTS cvcrm_data JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_cvcrm_id ON users(cvcrm_id);
CREATE INDEX IF NOT EXISTS idx_users_cvcrm_imob ON users(cvcrm_imobiliaria_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_categoria ON users(categoria);
CREATE INDEX IF NOT EXISTS idx_users_time ON users(time);

-- ============================================
-- PARTE 3: Tabela de SYNC LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type VARCHAR(50) NOT NULL, -- 'imobiliarias', 'corretores', 'full'
  status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'error'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Estatísticas
  total_items INTEGER DEFAULT 0,
  created INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,

  -- Detalhes
  error_details JSONB DEFAULT '[]',
  summary JSONB DEFAULT '{}',

  -- Quem executou
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at DESC);

-- Policy para sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for sync_logs" ON sync_logs FOR ALL USING (true);

-- ============================================
-- PARTE 4: Função de atualização de updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para imobiliarias
DROP TRIGGER IF EXISTS update_imobiliarias_updated_at ON imobiliarias;
CREATE TRIGGER update_imobiliarias_updated_at
    BEFORE UPDATE ON imobiliarias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PRONTO! Execute este script no seu banco.
-- ============================================
