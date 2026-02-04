-- Migration 038: Sistema de Cálculo de Comissões (Planilha do Calculista)
-- Este módulo é uma ferramenta de cálculo para preparar dados para a pagadoria
-- NÃO controla liberação de pagamentos - apenas calcula e organiza valores

-- 1. VENDAS COM COMISSÃO - Dados da venda para cálculo
CREATE TABLE IF NOT EXISTS comissao_vendas (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL,

  -- Identificação
  codigo VARCHAR(50) NOT NULL,
  referencia VARCHAR(100),  -- código externo/CV CRM

  -- Valores base
  valor_venda DECIMAL(15,2) NOT NULL,
  percentual_comissao DECIMAL(5,4) NOT NULL,  -- ex: 0.05 = 5%
  valor_comissao_total DECIMAL(15,2) GENERATED ALWAYS AS (valor_venda * percentual_comissao) STORED,

  -- Informações do imóvel
  empreendimento VARCHAR(255),
  unidade VARCHAR(100),

  -- Cliente
  cliente_nome VARCHAR(255),
  cliente_cpf VARCHAR(14),

  -- Datas
  data_venda DATE NOT NULL,

  -- Controle
  status VARCHAR(20) DEFAULT 'ativa' CHECK (status IN ('ativa', 'calculada', 'enviada', 'cancelada')),
  observacoes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,

  UNIQUE(workspace_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_comissao_vendas_workspace ON comissao_vendas(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comissao_vendas_status ON comissao_vendas(status);

-- 2. CORRETORES NA VENDA - Participação de cada corretor
CREATE TABLE IF NOT EXISTS comissao_corretores (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES comissao_vendas(id) ON DELETE CASCADE,

  -- Identificação (pode vincular a beneficiário existente ou cadastrar direto)
  beneficiario_id INTEGER REFERENCES im_beneficiarios(id),
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14),

  -- Participação
  percentual_participacao DECIMAL(5,4) NOT NULL,  -- ex: 0.40 = 40% da comissão
  valor_comissao DECIMAL(15,2) NOT NULL,  -- valor total que este corretor deve receber

  -- Prioridade de recebimento (para casos de fluxo de caixa limitado)
  prioridade INTEGER DEFAULT 0,  -- 0 = normal, maior = recebe primeiro

  -- Controle
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comissao_corretores_venda ON comissao_corretores(venda_id);
CREATE INDEX IF NOT EXISTS idx_comissao_corretores_beneficiario ON comissao_corretores(beneficiario_id);

-- 3. PARCELAS (CRONOGRAMA DE RECEBIMENTO) - Quando o dinheiro entra
CREATE TABLE IF NOT EXISTS comissao_parcelas (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES comissao_vendas(id) ON DELETE CASCADE,

  -- Identificação
  numero INTEGER NOT NULL,
  descricao VARCHAR(100),  -- "Ato", "Entrada", "Mensal 1/36", etc.

  -- Valores
  valor_parcela DECIMAL(15,2) NOT NULL,
  percentual_comissao DECIMAL(5,4) NOT NULL,  -- % da comissão que esta parcela representa

  -- Datas
  data_prevista DATE NOT NULL,
  data_recebimento DATE,  -- preenchido quando confirmado recebimento

  -- Controle
  status VARCHAR(20) DEFAULT 'prevista' CHECK (status IN ('prevista', 'recebida', 'cancelada')),

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(venda_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_comissao_parcelas_venda ON comissao_parcelas(venda_id);
CREATE INDEX IF NOT EXISTS idx_comissao_parcelas_status ON comissao_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_comissao_parcelas_data ON comissao_parcelas(data_prevista);

-- 4. MATRIZ DE CÁLCULO - Resultado do cálculo (o que vai pra pagadoria)
-- Esta tabela armazena o resultado calculado da matriz corretor x parcela
CREATE TABLE IF NOT EXISTS comissao_matriz (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES comissao_vendas(id) ON DELETE CASCADE,
  parcela_id INTEGER NOT NULL REFERENCES comissao_parcelas(id) ON DELETE CASCADE,
  corretor_id INTEGER NOT NULL REFERENCES comissao_corretores(id) ON DELETE CASCADE,

  -- Valores calculados
  valor_calculado DECIMAL(15,2) NOT NULL,  -- valor que o corretor recebe nesta parcela

  -- Auditoria do cálculo
  percentual_usado DECIMAL(5,4) NOT NULL,  -- % do corretor usado no cálculo
  formula_aplicada TEXT,  -- descrição da fórmula usada

  -- Controle de envio para pagadoria
  enviado_pagadoria BOOLEAN DEFAULT FALSE,
  data_envio_pagadoria TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(parcela_id, corretor_id)
);

CREATE INDEX IF NOT EXISTS idx_comissao_matriz_venda ON comissao_matriz(venda_id);
CREATE INDEX IF NOT EXISTS idx_comissao_matriz_parcela ON comissao_matriz(parcela_id);
CREATE INDEX IF NOT EXISTS idx_comissao_matriz_corretor ON comissao_matriz(corretor_id);

-- 5. FUNÇÃO PARA CALCULAR MATRIZ DE UMA VENDA
-- Esta função preenche a tabela comissao_matriz com os valores calculados
CREATE OR REPLACE FUNCTION fn_calcular_matriz_comissao(p_venda_id INTEGER)
RETURNS TABLE (
  corretor_nome VARCHAR,
  parcela_descricao VARCHAR,
  valor_calculado DECIMAL
) AS $$
DECLARE
  v_corretor RECORD;
  v_parcela RECORD;
  v_valor DECIMAL(15,2);
  v_percentual_parcela DECIMAL(5,4);
BEGIN
  -- Limpar cálculos anteriores desta venda
  DELETE FROM comissao_matriz WHERE venda_id = p_venda_id;

  -- Para cada corretor da venda
  FOR v_corretor IN
    SELECT id, nome, percentual_participacao, valor_comissao
    FROM comissao_corretores
    WHERE venda_id = p_venda_id
  LOOP
    -- Para cada parcela da venda
    FOR v_parcela IN
      SELECT id, numero, descricao, percentual_comissao
      FROM comissao_parcelas
      WHERE venda_id = p_venda_id
      ORDER BY numero
    LOOP
      -- Calcular valor: comissão do corretor * % da parcela
      v_valor := ROUND(v_corretor.valor_comissao * v_parcela.percentual_comissao, 2);

      -- Inserir na matriz
      INSERT INTO comissao_matriz (
        venda_id, parcela_id, corretor_id,
        valor_calculado, percentual_usado, formula_aplicada
      ) VALUES (
        p_venda_id, v_parcela.id, v_corretor.id,
        v_valor, v_corretor.percentual_participacao,
        format('R$ %s (comissão corretor) × %s%% (% parcela) = R$ %s',
          v_corretor.valor_comissao,
          (v_parcela.percentual_comissao * 100)::TEXT,
          v_valor)
      );

      -- Retornar para visualização
      RETURN QUERY SELECT
        v_corretor.nome::VARCHAR,
        COALESCE(v_parcela.descricao, 'Parcela ' || v_parcela.numero)::VARCHAR,
        v_valor;
    END LOOP;
  END LOOP;

  -- Atualizar status da venda
  UPDATE comissao_vendas SET status = 'calculada', updated_at = NOW() WHERE id = p_venda_id;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 6. VIEW PARA VISUALIZAÇÃO DA MATRIZ (formato planilha)
CREATE OR REPLACE VIEW vw_comissao_matriz_planilha AS
SELECT
  v.id as venda_id,
  v.codigo as venda_codigo,
  v.empreendimento,
  v.unidade,
  v.cliente_nome,
  v.valor_venda,
  v.valor_comissao_total,
  c.nome as corretor_nome,
  c.percentual_participacao,
  c.valor_comissao as corretor_comissao_total,
  p.numero as parcela_numero,
  p.descricao as parcela_descricao,
  p.data_prevista,
  p.data_recebimento,
  p.status as parcela_status,
  m.valor_calculado,
  m.enviado_pagadoria,
  m.data_envio_pagadoria
FROM comissao_vendas v
JOIN comissao_corretores c ON c.venda_id = v.id
JOIN comissao_parcelas p ON p.venda_id = v.id
LEFT JOIN comissao_matriz m ON m.parcela_id = p.id AND m.corretor_id = c.id
ORDER BY v.id, c.prioridade DESC, c.nome, p.numero;

-- Comentários
COMMENT ON TABLE comissao_vendas IS 'Vendas para cálculo de comissão - dados base';
COMMENT ON TABLE comissao_corretores IS 'Corretores participantes de cada venda e sua participação percentual';
COMMENT ON TABLE comissao_parcelas IS 'Cronograma de recebimento da venda (quando o dinheiro entra)';
COMMENT ON TABLE comissao_matriz IS 'Resultado do cálculo - matriz corretor x parcela com valores a pagar';
COMMENT ON FUNCTION fn_calcular_matriz_comissao IS 'Calcula a matriz de comissões para uma venda específica';
