-- ============================================================================
-- SISTEMA DE INTERMEDIAÇÃO IMOBILIÁRIA
-- Migration: 20260126_sistema_intermediacao.sql
-- Descrição: Criação das tabelas para gestão de vendas, comissões e pagamentos
-- ============================================================================

-- ============================================================================
-- 1. TABELA: vendas_intermediacao
-- Descrição: Registro de vendas imobiliárias para cálculo de intermediação
-- ============================================================================
CREATE TABLE vendas_intermediacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) UNIQUE NOT NULL, -- VND-YYYYMM-XXXX
  valor_total DECIMAL(15,2) NOT NULL,
  unidade VARCHAR(255) NOT NULL,
  empreendimento VARCHAR(255) NOT NULL,
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_cpf VARCHAR(14),
  cliente_email VARCHAR(255),
  cliente_telefone VARCHAR(20),
  data_venda DATE NOT NULL,
  percentual_intermediacao DECIMAL(5,2) NOT NULL, -- 0-100
  valor_comissao DECIMAL(15,2) GENERATED ALWAYS AS (valor_total * percentual_intermediacao / 100) STORED,
  status VARCHAR(20) DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'em_processamento', 'concluida', 'paga')),
  descricao TEXT,
  tenant_id UUID NOT NULL,
  criado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE vendas_intermediacao IS 'Registro de vendas imobiliárias para cálculo de comissão de intermediação';
COMMENT ON COLUMN vendas_intermediacao.codigo IS 'Código único no formato VND-YYYYMM-XXXX';
COMMENT ON COLUMN vendas_intermediacao.percentual_intermediacao IS 'Percentual de comissão (0-100)';
COMMENT ON COLUMN vendas_intermediacao.valor_comissao IS 'Valor calculado automaticamente: valor_total * percentual / 100';

-- ============================================================================
-- 2. TABELA: beneficiarios_intermediacao
-- Descrição: Cadastro de pessoas/empresas que recebem comissões
-- ============================================================================
CREATE TABLE beneficiarios_intermediacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) UNIQUE NOT NULL, -- BEN-XXXX
  nome VARCHAR(255) NOT NULL,
  tipo_documento VARCHAR(4) NOT NULL CHECK (tipo_documento IN ('cpf', 'cnpj')),
  documento VARCHAR(20) UNIQUE NOT NULL,
  cargo VARCHAR(50) NOT NULL, -- Corretor, Gerente, Proprietário, Imobiliária
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  banco VARCHAR(100),
  agencia VARCHAR(20),
  conta VARCHAR(30),
  tipo_conta VARCHAR(20),
  pix VARCHAR(255),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE beneficiarios_intermediacao IS 'Cadastro de beneficiários que recebem comissões de intermediação';
COMMENT ON COLUMN beneficiarios_intermediacao.cargo IS 'Função: Corretor, Gerente, Proprietário, Imobiliária';
COMMENT ON COLUMN beneficiarios_intermediacao.tipo_documento IS 'Tipo: cpf ou cnpj';

-- ============================================================================
-- 3. TABELA: distribuicao_comissao
-- Descrição: Distribuição da comissão entre beneficiários de uma venda
-- ============================================================================
CREATE TABLE distribuicao_comissao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES vendas_intermediacao(id) ON DELETE CASCADE,
  beneficiario_id UUID NOT NULL REFERENCES beneficiarios_intermediacao(id),
  percentual DECIMAL(5,2) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venda_id, beneficiario_id)
);

COMMENT ON TABLE distribuicao_comissao IS 'Distribuição da comissão entre os beneficiários de cada venda';
COMMENT ON COLUMN distribuicao_comissao.percentual IS 'Percentual do beneficiário sobre a comissão total';
COMMENT ON COLUMN distribuicao_comissao.valor IS 'Valor em reais que o beneficiário receberá';

-- ============================================================================
-- 4. TABELA: parcelas_intermediacao
-- Descrição: Parcelas de pagamento de cada distribuição de comissão
-- ============================================================================
CREATE TABLE parcelas_intermediacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuicao_id UUID NOT NULL REFERENCES distribuicao_comissao(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'vencida', 'paga', 'cancelada')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE parcelas_intermediacao IS 'Parcelas de pagamento das comissões distribuídas';
COMMENT ON COLUMN parcelas_intermediacao.numero IS 'Número sequencial da parcela (1, 2, 3...)';
COMMENT ON COLUMN parcelas_intermediacao.status IS 'Status: pendente, vencida, paga, cancelada';

-- ============================================================================
-- 5. TABELA: pagamentos_intermediacao
-- Descrição: Registro de pagamentos realizados
-- ============================================================================
CREATE TABLE pagamentos_intermediacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcela_id UUID NOT NULL REFERENCES parcelas_intermediacao(id),
  data_pagamento DATE NOT NULL,
  metodo VARCHAR(50) NOT NULL, -- transferencia, deposito, pix, outro
  comprovante TEXT,
  referencia VARCHAR(100),
  registrado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pagamentos_intermediacao IS 'Registro de pagamentos efetuados para as parcelas';
COMMENT ON COLUMN pagamentos_intermediacao.metodo IS 'Método: transferencia, deposito, pix, outro';
COMMENT ON COLUMN pagamentos_intermediacao.comprovante IS 'URL ou referência do comprovante';

-- ============================================================================
-- 6. TABELA: log_auditoria_intermediacao
-- Descrição: Log de todas as operações para auditoria e compliance
-- ============================================================================
CREATE TABLE log_auditoria_intermediacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela VARCHAR(50) NOT NULL,
  registro_id UUID NOT NULL,
  operacao VARCHAR(10) NOT NULL CHECK (operacao IN ('create', 'update', 'delete')),
  dados_anteriores JSONB,
  dados_novos JSONB,
  campos_alterados TEXT[],
  usuario_id UUID NOT NULL,
  usuario_nome VARCHAR(255),
  justificativa TEXT,
  ip VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE log_auditoria_intermediacao IS 'Log de auditoria para todas as operações do sistema';
COMMENT ON COLUMN log_auditoria_intermediacao.campos_alterados IS 'Array com nomes dos campos modificados';
COMMENT ON COLUMN log_auditoria_intermediacao.justificativa IS 'Motivo da alteração (obrigatório para updates críticos)';

-- ============================================================================
-- 7. TABELA: regras_parcelamento
-- Descrição: Configuração de regras de parcelamento por tenant
-- ============================================================================
CREATE TABLE regras_parcelamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  num_parcelas INTEGER NOT NULL,
  dias_entre_parcelas INTEGER DEFAULT 30,
  ativo BOOLEAN DEFAULT true,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE regras_parcelamento IS 'Configuração das regras de parcelamento disponíveis';
COMMENT ON COLUMN regras_parcelamento.num_parcelas IS 'Quantidade de parcelas';
COMMENT ON COLUMN regras_parcelamento.dias_entre_parcelas IS 'Intervalo em dias entre parcelas (padrão: 30)';

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Índices para vendas_intermediacao
CREATE INDEX idx_vendas_status ON vendas_intermediacao(status);
CREATE INDEX idx_vendas_tenant ON vendas_intermediacao(tenant_id);
CREATE INDEX idx_vendas_data ON vendas_intermediacao(data_venda);
CREATE INDEX idx_vendas_criado_por ON vendas_intermediacao(criado_por);
CREATE INDEX idx_vendas_empreendimento ON vendas_intermediacao(empreendimento);

-- Índices para beneficiarios_intermediacao
CREATE INDEX idx_beneficiarios_tenant ON beneficiarios_intermediacao(tenant_id);
CREATE INDEX idx_beneficiarios_documento ON beneficiarios_intermediacao(documento);
CREATE INDEX idx_beneficiarios_cargo ON beneficiarios_intermediacao(cargo);
CREATE INDEX idx_beneficiarios_ativo ON beneficiarios_intermediacao(ativo);

-- Índices para distribuicao_comissao
CREATE INDEX idx_distribuicao_venda ON distribuicao_comissao(venda_id);
CREATE INDEX idx_distribuicao_beneficiario ON distribuicao_comissao(beneficiario_id);

-- Índices para parcelas_intermediacao
CREATE INDEX idx_parcelas_status ON parcelas_intermediacao(status);
CREATE INDEX idx_parcelas_vencimento ON parcelas_intermediacao(data_vencimento);
CREATE INDEX idx_parcelas_distribuicao ON parcelas_intermediacao(distribuicao_id);

-- Índices para pagamentos_intermediacao
CREATE INDEX idx_pagamentos_parcela ON pagamentos_intermediacao(parcela_id);
CREATE INDEX idx_pagamentos_data ON pagamentos_intermediacao(data_pagamento);

-- Índices para log_auditoria_intermediacao
CREATE INDEX idx_auditoria_tabela ON log_auditoria_intermediacao(tabela, registro_id);
CREATE INDEX idx_auditoria_data ON log_auditoria_intermediacao(created_at);
CREATE INDEX idx_auditoria_usuario ON log_auditoria_intermediacao(usuario_id);

-- Índices para regras_parcelamento
CREATE INDEX idx_regras_tenant ON regras_parcelamento(tenant_id);
CREATE INDEX idx_regras_ativo ON regras_parcelamento(ativo);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER tr_vendas_updated_at
  BEFORE UPDATE ON vendas_intermediacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_beneficiarios_updated_at
  BEFORE UPDATE ON beneficiarios_intermediacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_parcelas_updated_at
  BEFORE UPDATE ON parcelas_intermediacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNÇÃO: Marcar parcelas vencidas automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION check_parcelas_vencidas()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE parcelas_intermediacao
  SET status = 'vencida'
  WHERE status = 'pendente'
    AND data_vencimento < CURRENT_DATE;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNÇÃO: Gerar código sequencial de venda
-- Formato: VND-YYYYMM-XXXX
-- ============================================================================
CREATE OR REPLACE FUNCTION gerar_codigo_venda(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_seq INTEGER;
  v_codigo VARCHAR;
  v_prefixo VARCHAR;
BEGIN
  v_prefixo := 'VND-' || TO_CHAR(NOW(), 'YYYYMM') || '-';

  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 12) AS INTEGER)), 0) + 1
  INTO v_seq
  FROM vendas_intermediacao
  WHERE tenant_id = p_tenant_id
    AND codigo LIKE v_prefixo || '%';

  v_codigo := v_prefixo || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_codigo;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION gerar_codigo_venda IS 'Gera código único para venda no formato VND-YYYYMM-XXXX';

-- ============================================================================
-- FUNÇÃO: Gerar código de beneficiário
-- Formato: BEN-XXXX
-- ============================================================================
CREATE OR REPLACE FUNCTION gerar_codigo_beneficiario(p_tenant_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo FROM 5) AS INTEGER)), 0) + 1
  INTO v_seq
  FROM beneficiarios_intermediacao
  WHERE tenant_id = p_tenant_id;

  RETURN 'BEN-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION gerar_codigo_beneficiario IS 'Gera código único para beneficiário no formato BEN-XXXX';

-- ============================================================================
-- FUNÇÃO: Calcular total de comissões por beneficiário
-- ============================================================================
CREATE OR REPLACE FUNCTION calcular_total_comissoes_beneficiario(
  p_beneficiario_id UUID,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE (
  total_vendas BIGINT,
  valor_total_comissoes DECIMAL(15,2),
  valor_pago DECIMAL(15,2),
  valor_pendente DECIMAL(15,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT dc.venda_id)::BIGINT as total_vendas,
    COALESCE(SUM(dc.valor), 0)::DECIMAL(15,2) as valor_total_comissoes,
    COALESCE(SUM(
      CASE WHEN pi.status = 'paga' THEN pi.valor ELSE 0 END
    ), 0)::DECIMAL(15,2) as valor_pago,
    COALESCE(SUM(
      CASE WHEN pi.status IN ('pendente', 'vencida') THEN pi.valor ELSE 0 END
    ), 0)::DECIMAL(15,2) as valor_pendente
  FROM distribuicao_comissao dc
  JOIN vendas_intermediacao v ON v.id = dc.venda_id
  LEFT JOIN parcelas_intermediacao pi ON pi.distribuicao_id = dc.id
  WHERE dc.beneficiario_id = p_beneficiario_id
    AND (p_data_inicio IS NULL OR v.data_venda >= p_data_inicio)
    AND (p_data_fim IS NULL OR v.data_venda <= p_data_fim);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_total_comissoes_beneficiario IS 'Retorna resumo de comissões de um beneficiário';

-- ============================================================================
-- FUNÇÃO: Criar parcelas automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION criar_parcelas_distribuicao(
  p_distribuicao_id UUID,
  p_num_parcelas INTEGER,
  p_dias_entre_parcelas INTEGER DEFAULT 30
)
RETURNS SETOF parcelas_intermediacao AS $$
DECLARE
  v_valor_total DECIMAL(15,2);
  v_valor_parcela DECIMAL(15,2);
  v_valor_primeira DECIMAL(15,2);
  v_data_base DATE;
  i INTEGER;
BEGIN
  -- Buscar valor total da distribuição
  SELECT valor INTO v_valor_total
  FROM distribuicao_comissao
  WHERE id = p_distribuicao_id;

  IF v_valor_total IS NULL THEN
    RAISE EXCEPTION 'Distribuição não encontrada: %', p_distribuicao_id;
  END IF;

  -- Calcular valor de cada parcela
  v_valor_parcela := TRUNC(v_valor_total / p_num_parcelas, 2);
  -- Primeira parcela absorve diferença de arredondamento
  v_valor_primeira := v_valor_total - (v_valor_parcela * (p_num_parcelas - 1));

  v_data_base := CURRENT_DATE;

  -- Criar parcelas
  FOR i IN 1..p_num_parcelas LOOP
    RETURN QUERY
    INSERT INTO parcelas_intermediacao (
      distribuicao_id,
      numero,
      valor,
      data_vencimento,
      status
    ) VALUES (
      p_distribuicao_id,
      i,
      CASE WHEN i = 1 THEN v_valor_primeira ELSE v_valor_parcela END,
      v_data_base + (p_dias_entre_parcelas * (i - 1)),
      'pendente'
    )
    RETURNING *;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION criar_parcelas_distribuicao IS 'Cria parcelas automaticamente para uma distribuição de comissão';

-- ============================================================================
-- FUNÇÃO: Registrar auditoria
-- ============================================================================
CREATE OR REPLACE FUNCTION registrar_auditoria(
  p_tabela VARCHAR,
  p_registro_id UUID,
  p_operacao VARCHAR,
  p_dados_anteriores JSONB,
  p_dados_novos JSONB,
  p_usuario_id UUID,
  p_usuario_nome VARCHAR DEFAULT NULL,
  p_justificativa TEXT DEFAULT NULL,
  p_ip VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_campos_alterados TEXT[];
  v_key TEXT;
  v_log_id UUID;
BEGIN
  -- Identificar campos alterados (apenas para updates)
  IF p_operacao = 'update' AND p_dados_anteriores IS NOT NULL AND p_dados_novos IS NOT NULL THEN
    FOR v_key IN SELECT jsonb_object_keys(p_dados_novos)
    LOOP
      IF p_dados_anteriores->v_key IS DISTINCT FROM p_dados_novos->v_key THEN
        v_campos_alterados := array_append(v_campos_alterados, v_key);
      END IF;
    END LOOP;
  END IF;

  INSERT INTO log_auditoria_intermediacao (
    tabela,
    registro_id,
    operacao,
    dados_anteriores,
    dados_novos,
    campos_alterados,
    usuario_id,
    usuario_nome,
    justificativa,
    ip
  ) VALUES (
    p_tabela,
    p_registro_id,
    p_operacao,
    p_dados_anteriores,
    p_dados_novos,
    v_campos_alterados,
    p_usuario_id,
    p_usuario_nome,
    p_justificativa,
    p_ip
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION registrar_auditoria IS 'Registra uma entrada no log de auditoria';

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Resumo de vendas com totais
CREATE OR REPLACE VIEW vw_vendas_resumo AS
SELECT
  v.id,
  v.codigo,
  v.valor_total,
  v.valor_comissao,
  v.unidade,
  v.empreendimento,
  v.cliente_nome,
  v.data_venda,
  v.status,
  v.tenant_id,
  COUNT(DISTINCT dc.id) as total_beneficiarios,
  COALESCE(SUM(
    CASE WHEN pi.status = 'paga' THEN pi.valor ELSE 0 END
  ), 0) as valor_pago,
  COALESCE(SUM(
    CASE WHEN pi.status IN ('pendente', 'vencida') THEN pi.valor ELSE 0 END
  ), 0) as valor_pendente
FROM vendas_intermediacao v
LEFT JOIN distribuicao_comissao dc ON dc.venda_id = v.id
LEFT JOIN parcelas_intermediacao pi ON pi.distribuicao_id = dc.id
GROUP BY v.id;

COMMENT ON VIEW vw_vendas_resumo IS 'Resumo de vendas com valores pagos e pendentes';

-- View: Parcelas com dados do beneficiário
CREATE OR REPLACE VIEW vw_parcelas_detalhadas AS
SELECT
  pi.id,
  pi.numero,
  pi.valor,
  pi.data_vencimento,
  pi.status,
  b.id as beneficiario_id,
  b.codigo as beneficiario_codigo,
  b.nome as beneficiario_nome,
  b.documento as beneficiario_documento,
  v.id as venda_id,
  v.codigo as venda_codigo,
  v.empreendimento,
  v.unidade,
  v.tenant_id,
  pg.data_pagamento,
  pg.metodo as metodo_pagamento
FROM parcelas_intermediacao pi
JOIN distribuicao_comissao dc ON dc.id = pi.distribuicao_id
JOIN beneficiarios_intermediacao b ON b.id = dc.beneficiario_id
JOIN vendas_intermediacao v ON v.id = dc.venda_id
LEFT JOIN pagamentos_intermediacao pg ON pg.parcela_id = pi.id;

COMMENT ON VIEW vw_parcelas_detalhadas IS 'Parcelas com informações do beneficiário e venda';

-- View: Dashboard de comissões por tenant
CREATE OR REPLACE VIEW vw_dashboard_comissoes AS
SELECT
  v.tenant_id,
  DATE_TRUNC('month', v.data_venda) as mes,
  COUNT(DISTINCT v.id) as total_vendas,
  SUM(v.valor_total) as valor_vendas,
  SUM(v.valor_comissao) as valor_comissoes,
  COALESCE(SUM(
    CASE WHEN pi.status = 'paga' THEN pi.valor ELSE 0 END
  ), 0) as comissoes_pagas,
  COALESCE(SUM(
    CASE WHEN pi.status = 'pendente' THEN pi.valor ELSE 0 END
  ), 0) as comissoes_pendentes,
  COALESCE(SUM(
    CASE WHEN pi.status = 'vencida' THEN pi.valor ELSE 0 END
  ), 0) as comissoes_vencidas
FROM vendas_intermediacao v
LEFT JOIN distribuicao_comissao dc ON dc.venda_id = v.id
LEFT JOIN parcelas_intermediacao pi ON pi.distribuicao_id = dc.id
GROUP BY v.tenant_id, DATE_TRUNC('month', v.data_venda);

COMMENT ON VIEW vw_dashboard_comissoes IS 'Dashboard mensal de comissões por tenant';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE vendas_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiarios_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuicao_comissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelas_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_auditoria_intermediacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE regras_parcelamento ENABLE ROW LEVEL SECURITY;

-- Políticas para vendas_intermediacao
CREATE POLICY "vendas_tenant_isolation" ON vendas_intermediacao
  FOR ALL USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Políticas para beneficiarios_intermediacao
CREATE POLICY "beneficiarios_tenant_isolation" ON beneficiarios_intermediacao
  FOR ALL USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Políticas para regras_parcelamento
CREATE POLICY "regras_tenant_isolation" ON regras_parcelamento
  FOR ALL USING (tenant_id = auth.uid() OR tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- ============================================================================
-- DADOS INICIAIS: Regras de parcelamento padrão
-- ============================================================================
-- Nota: Inserir após criar o tenant, exemplo:
-- INSERT INTO regras_parcelamento (nome, descricao, num_parcelas, dias_entre_parcelas, tenant_id)
-- VALUES
--   ('À Vista', 'Pagamento único', 1, 0, 'tenant-uuid'),
--   ('2x', 'Parcelamento em 2 vezes', 2, 30, 'tenant-uuid'),
--   ('3x', 'Parcelamento em 3 vezes', 3, 30, 'tenant-uuid'),
--   ('4x', 'Parcelamento em 4 vezes', 4, 30, 'tenant-uuid'),
--   ('6x', 'Parcelamento em 6 vezes', 6, 30, 'tenant-uuid');

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================
