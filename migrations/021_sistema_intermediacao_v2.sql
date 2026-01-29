-- =============================================================================
-- Migration: 021_sistema_intermediacao_v2.sql
-- Descrição: Sistema completo de intermediação de vendas e comissões (CORRIGIDO)
-- Data: 28 Jan 2026
-- Correções: UUID para users, referências corretas, campos opcionais
-- =============================================================================

-- 1. VENDAS - Registro das vendas imobiliárias
CREATE TABLE IF NOT EXISTS im_vendas (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Dados da venda (referências opcionais)
  empreendimento_id INTEGER, -- pode referenciar cvcrm_empreendimentos se existir
  unidade VARCHAR(50),
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_cpf VARCHAR(14),
  cliente_telefone VARCHAR(20),
  cliente_email VARCHAR(255),
  
  -- Valores
  valor_venda DECIMAL(15,2) NOT NULL,
  valor_comissao DECIMAL(15,2) NOT NULL,
  percentual_comissao DECIMAL(5,2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pendente',
  -- pendente | aprovada | rejeitada | paga | cancelada
  
  -- Datas
  data_venda DATE NOT NULL,
  data_aprovacao DATE,
  data_pagamento DATE,
  
  -- Observações
  observacoes TEXT,
  
  -- Controle (UUID para users)
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT im_vendas_valor_positivo CHECK (valor_venda > 0),
  CONSTRAINT im_vendas_comissao_positiva CHECK (valor_comissao > 0)
);

-- 2. BENEFICIÁRIOS - Corretores/equipe que recebem parte da comissão
CREATE TABLE IF NOT EXISTS im_beneficiarios (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Dados do beneficiário
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  -- corretor | lider | gerente | indicador | outro
  
  -- Identificação
  cpf VARCHAR(14),
  telefone VARCHAR(20),
  email VARCHAR(255),
  
  -- Referência opcional ao usuário do sistema
  user_id UUID REFERENCES users(id),
  
  -- Dados bancários (opcional)
  banco VARCHAR(100),
  agencia VARCHAR(20),
  conta VARCHAR(30),
  tipo_conta VARCHAR(20),
  pix VARCHAR(255),
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  
  -- Controle
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. DISTRIBUIÇÃO - Split de comissão entre beneficiários
CREATE TABLE IF NOT EXISTS im_distribuicao (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES im_vendas(id) ON DELETE CASCADE,
  beneficiario_id INTEGER NOT NULL REFERENCES im_beneficiarios(id) ON DELETE RESTRICT,
  
  -- Distribuição
  percentual DECIMAL(5,2) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  tipo VARCHAR(50),
  -- comissao | bonus | indicacao | lideranca
  
  -- Observações
  observacoes TEXT,
  
  -- Controle
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT im_distribuicao_percentual CHECK (percentual > 0 AND percentual <= 100),
  CONSTRAINT im_distribuicao_valor_positivo CHECK (valor > 0)
);

-- 4. PARCELAS - Parcelamento das comissões
CREATE TABLE IF NOT EXISTS im_parcelas (
  id SERIAL PRIMARY KEY,
  distribuicao_id INTEGER NOT NULL REFERENCES im_distribuicao(id) ON DELETE CASCADE,
  
  -- Parcela
  numero INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  vencimento DATE NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pendente',
  -- pendente | paga | atrasada | cancelada
  
  -- Pagamento
  data_pagamento DATE,
  forma_pagamento VARCHAR(50),
  comprovante_url TEXT,
  
  -- Observações
  observacoes TEXT,
  
  -- Controle
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT im_parcelas_numero_positivo CHECK (numero > 0),
  CONSTRAINT im_parcelas_valor_positivo CHECK (valor > 0)
);

-- 5. PAGAMENTOS - Registro de pagamentos efetuados
CREATE TABLE IF NOT EXISTS im_pagamentos (
  id SERIAL PRIMARY KEY,
  parcela_id INTEGER NOT NULL REFERENCES im_parcelas(id) ON DELETE CASCADE,
  
  -- Pagamento
  valor_pago DECIMAL(15,2) NOT NULL,
  data_pagamento DATE NOT NULL,
  forma_pagamento VARCHAR(50) NOT NULL,
  -- pix | transferencia | dinheiro | cheque | outro
  
  -- Comprovante
  comprovante_url TEXT,
  
  -- Observações
  observacoes TEXT,
  
  -- Controle (UUID para users)
  realizado_por UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT im_pagamentos_valor_positivo CHECK (valor_pago > 0)
);

-- 6. AUDITORIA - Log de alterações importantes
CREATE TABLE IF NOT EXISTS im_auditoria (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Registro
  tabela VARCHAR(50) NOT NULL,
  registro_id INTEGER NOT NULL,
  acao VARCHAR(50) NOT NULL,
  -- criacao | aprovacao | pagamento | cancelamento | edicao
  
  -- Dados
  dados_anteriores JSONB,
  dados_novos JSONB,
  
  -- Contexto (UUID para users)
  usuario_id UUID REFERENCES users(id),
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  -- Controle
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- ÍNDICES
-- =============================================================================

-- im_vendas
CREATE INDEX IF NOT EXISTS idx_im_vendas_tenant ON im_vendas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_im_vendas_status ON im_vendas(status);
CREATE INDEX IF NOT EXISTS idx_im_vendas_data_venda ON im_vendas(data_venda);
CREATE INDEX IF NOT EXISTS idx_im_vendas_empreendimento ON im_vendas(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_im_vendas_cliente_cpf ON im_vendas(cliente_cpf);
CREATE INDEX IF NOT EXISTS idx_im_vendas_created_by ON im_vendas(created_by);

-- im_beneficiarios
CREATE INDEX IF NOT EXISTS idx_im_beneficiarios_tenant ON im_beneficiarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_im_beneficiarios_tipo ON im_beneficiarios(tipo);
CREATE INDEX IF NOT EXISTS idx_im_beneficiarios_cpf ON im_beneficiarios(cpf);
CREATE INDEX IF NOT EXISTS idx_im_beneficiarios_ativo ON im_beneficiarios(ativo);
CREATE INDEX IF NOT EXISTS idx_im_beneficiarios_user_id ON im_beneficiarios(user_id);

-- im_distribuicao
CREATE INDEX IF NOT EXISTS idx_im_distribuicao_venda ON im_distribuicao(venda_id);
CREATE INDEX IF NOT EXISTS idx_im_distribuicao_beneficiario ON im_distribuicao(beneficiario_id);

-- im_parcelas
CREATE INDEX IF NOT EXISTS idx_im_parcelas_distribuicao ON im_parcelas(distribuicao_id);
CREATE INDEX IF NOT EXISTS idx_im_parcelas_status ON im_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_im_parcelas_vencimento ON im_parcelas(vencimento);

-- im_pagamentos
CREATE INDEX IF NOT EXISTS idx_im_pagamentos_parcela ON im_pagamentos(parcela_id);
CREATE INDEX IF NOT EXISTS idx_im_pagamentos_data ON im_pagamentos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_im_pagamentos_realizado_por ON im_pagamentos(realizado_por);

-- im_auditoria
CREATE INDEX IF NOT EXISTS idx_im_auditoria_tenant ON im_auditoria(tenant_id);
CREATE INDEX IF NOT EXISTS idx_im_auditoria_tabela ON im_auditoria(tabela, registro_id);
CREATE INDEX IF NOT EXISTS idx_im_auditoria_usuario ON im_auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_im_auditoria_created ON im_auditoria(created_at);

-- =============================================================================
-- TRIGGERS para updated_at
-- =============================================================================

-- Criar função se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_im_vendas_updated_at ON im_vendas;
CREATE TRIGGER update_im_vendas_updated_at BEFORE UPDATE ON im_vendas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_im_beneficiarios_updated_at ON im_beneficiarios;
CREATE TRIGGER update_im_beneficiarios_updated_at BEFORE UPDATE ON im_beneficiarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_im_distribuicao_updated_at ON im_distribuicao;
CREATE TRIGGER update_im_distribuicao_updated_at BEFORE UPDATE ON im_distribuicao
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_im_parcelas_updated_at ON im_parcelas;
CREATE TRIGGER update_im_parcelas_updated_at BEFORE UPDATE ON im_parcelas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMENTÁRIOS
-- =============================================================================

COMMENT ON TABLE im_vendas IS 'Registro de vendas imobiliárias para intermediação';
COMMENT ON TABLE im_beneficiarios IS 'Corretores e equipe que recebem comissões (intermediação)';
COMMENT ON TABLE im_distribuicao IS 'Distribuição de comissão entre beneficiários';
COMMENT ON TABLE im_parcelas IS 'Parcelamento das comissões a pagar';
COMMENT ON TABLE im_pagamentos IS 'Registro de pagamentos efetuados';
COMMENT ON TABLE im_auditoria IS 'Log de auditoria de todas as alterações';

COMMENT ON COLUMN im_beneficiarios.user_id IS 'Referência opcional ao usuário do sistema (users.id)';
COMMENT ON COLUMN im_vendas.created_by IS 'Usuário que criou o registro (users.id)';
COMMENT ON COLUMN im_pagamentos.realizado_por IS 'Usuário que realizou o pagamento (users.id)';
COMMENT ON COLUMN im_auditoria.usuario_id IS 'Usuário que executou a ação (users.id)';
