-- Migration 039: Extensões para Modelo Webropay
-- Adiciona suporte a grupos (IMOB/PRT), documento CPF/CNPJ, valores manuais na matriz
-- e dados extras do cliente para exportação Webropay

-- ============================================================================
-- 1. NOVOS CAMPOS NA TABELA comissao_corretores
-- ============================================================================

-- Documento (CPF ou CNPJ)
ALTER TABLE comissao_corretores ADD COLUMN IF NOT EXISTS documento VARCHAR(20);
ALTER TABLE comissao_corretores ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(10) CHECK (tipo_documento IS NULL OR tipo_documento IN ('cpf', 'cnpj'));

-- Grupo (IMOB ou PRT)
ALTER TABLE comissao_corretores ADD COLUMN IF NOT EXISTS grupo VARCHAR(20) CHECK (grupo IS NULL OR grupo IN ('imob', 'prt'));

-- Cargo do beneficiário
ALTER TABLE comissao_corretores ADD COLUMN IF NOT EXISTS cargo VARCHAR(50);

-- Percentual sobre VGV (ex: 0.0035 = 0,35%)
ALTER TABLE comissao_corretores ADD COLUMN IF NOT EXISTS percentual_vgv DECIMAL(6,4);

-- Dados bancários em JSON
ALTER TABLE comissao_corretores ADD COLUMN IF NOT EXISTS dados_bancarios_json JSONB;

-- ============================================================================
-- 2. NOVOS CAMPOS NA TABELA comissao_vendas (Dados do Cliente)
-- ============================================================================

ALTER TABLE comissao_vendas ADD COLUMN IF NOT EXISTS cliente_rg VARCHAR(20);
ALTER TABLE comissao_vendas ADD COLUMN IF NOT EXISTS cliente_endereco TEXT;
ALTER TABLE comissao_vendas ADD COLUMN IF NOT EXISTS cliente_telefone VARCHAR(20);
ALTER TABLE comissao_vendas ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(100);
ALTER TABLE comissao_vendas ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50);
ALTER TABLE comissao_vendas ADD COLUMN IF NOT EXISTS vencimento_pagamento DATE;

-- ============================================================================
-- 3. NOVOS CAMPOS NA TABELA comissao_matriz (Valores Manuais)
-- ============================================================================

-- Valor digitado manualmente (NULL = usar calculado automático)
ALTER TABLE comissao_matriz ADD COLUMN IF NOT EXISTS valor_manual DECIMAL(15,2);

-- Flag indicando se foi editado manualmente
ALTER TABLE comissao_matriz ADD COLUMN IF NOT EXISTS editado_manualmente BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- 4. NOVA TABELA: comissao_grupos (Divisão IMOB/PRT por Venda)
-- ============================================================================

CREATE TABLE IF NOT EXISTS comissao_grupos (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES comissao_vendas(id) ON DELETE CASCADE,
  codigo VARCHAR(10) NOT NULL CHECK (codigo IN ('imob', 'prt')),
  nome VARCHAR(50),
  percentual_vgv DECIMAL(6,4) NOT NULL, -- % do VGV que esse grupo recebe
  valor_total DECIMAL(15,2), -- valor calculado
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(venda_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_comissao_grupos_venda ON comissao_grupos(venda_id);

-- ============================================================================
-- 5. TABELA DE BENEFICIÁRIOS PADRÃO (Templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS comissao_beneficiarios_padrao (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  grupo VARCHAR(20) NOT NULL CHECK (grupo IN ('imob', 'prt')),
  cargo VARCHAR(50) NOT NULL,
  nome VARCHAR(255), -- Nome padrão (pode ser vazio para preencher depois)
  documento VARCHAR(20),
  tipo_documento VARCHAR(10) CHECK (tipo_documento IS NULL OR tipo_documento IN ('cpf', 'cnpj')),
  percentual_vgv DECIMAL(6,4), -- % padrão sobre VGV
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comissao_beneficiarios_padrao_workspace ON comissao_beneficiarios_padrao(workspace_id);
CREATE INDEX IF NOT EXISTS idx_comissao_beneficiarios_padrao_grupo ON comissao_beneficiarios_padrao(grupo);

-- ============================================================================
-- 6. FUNÇÃO ATUALIZADA PARA CALCULAR MATRIZ COM VALORES MANUAIS
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_calcular_matriz_comissao_v2(p_venda_id INTEGER)
RETURNS TABLE (
  corretor_nome VARCHAR,
  parcela_descricao VARCHAR,
  valor_calculado DECIMAL,
  valor_manual DECIMAL,
  valor_final DECIMAL
) AS $$
DECLARE
  v_corretor RECORD;
  v_parcela RECORD;
  v_valor_calc DECIMAL(15,2);
  v_valor_man DECIMAL(15,2);
  v_editado BOOLEAN;
BEGIN
  -- Não apaga matriz existente se há valores manuais
  -- Apenas recalcula os valores automáticos

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
      -- Calcular valor automático: comissão do corretor * % da parcela
      v_valor_calc := ROUND(v_corretor.valor_comissao * v_parcela.percentual_comissao, 2);

      -- Verificar se já existe registro com valor manual
      SELECT valor_manual, editado_manualmente
      INTO v_valor_man, v_editado
      FROM comissao_matriz
      WHERE parcela_id = v_parcela.id AND corretor_id = v_corretor.id;

      IF NOT FOUND THEN
        -- Inserir novo registro
        INSERT INTO comissao_matriz (
          venda_id, parcela_id, corretor_id,
          valor_calculado, percentual_usado, formula_aplicada,
          valor_manual, editado_manualmente
        ) VALUES (
          p_venda_id, v_parcela.id, v_corretor.id,
          v_valor_calc, v_corretor.percentual_participacao,
          format('R$ %s × %s%% = R$ %s',
            v_corretor.valor_comissao,
            (v_parcela.percentual_comissao * 100)::TEXT,
            v_valor_calc),
          NULL, FALSE
        );
        v_valor_man := NULL;
        v_editado := FALSE;
      ELSE
        -- Atualizar valor calculado (mantém manual se existir)
        UPDATE comissao_matriz
        SET valor_calculado = v_valor_calc,
            percentual_usado = v_corretor.percentual_participacao,
            formula_aplicada = format('R$ %s × %s%% = R$ %s',
              v_corretor.valor_comissao,
              (v_parcela.percentual_comissao * 100)::TEXT,
              v_valor_calc)
        WHERE parcela_id = v_parcela.id AND corretor_id = v_corretor.id;
      END IF;

      -- Retornar para visualização
      RETURN QUERY SELECT
        v_corretor.nome::VARCHAR,
        COALESCE(v_parcela.descricao, 'Parcela ' || v_parcela.numero)::VARCHAR,
        v_valor_calc,
        v_valor_man,
        COALESCE(v_valor_man, v_valor_calc);
    END LOOP;
  END LOOP;

  -- Atualizar status da venda
  UPDATE comissao_vendas SET status = 'calculada', updated_at = NOW() WHERE id = p_venda_id;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. VIEW ATUALIZADA COM SUPORTE A VALORES MANUAIS
-- ============================================================================

CREATE OR REPLACE VIEW vw_comissao_matriz_planilha_v2 AS
SELECT
  v.id as venda_id,
  v.codigo as venda_codigo,
  v.empreendimento,
  v.unidade,
  v.cliente_nome,
  v.cliente_cpf,
  v.cliente_rg,
  v.cliente_email,
  v.cliente_telefone,
  v.cliente_endereco,
  v.valor_venda,
  v.valor_comissao_total,
  v.forma_pagamento,
  c.id as corretor_id,
  c.nome as corretor_nome,
  c.documento as corretor_documento,
  c.tipo_documento,
  c.grupo,
  c.cargo,
  c.percentual_participacao,
  c.percentual_vgv,
  c.valor_comissao as corretor_comissao_total,
  p.id as parcela_id,
  p.numero as parcela_numero,
  p.descricao as parcela_descricao,
  p.data_prevista,
  p.data_recebimento,
  p.status as parcela_status,
  m.valor_calculado,
  m.valor_manual,
  COALESCE(m.valor_manual, m.valor_calculado) as valor_final,
  m.editado_manualmente,
  m.enviado_pagadoria,
  m.data_envio_pagadoria
FROM comissao_vendas v
JOIN comissao_corretores c ON c.venda_id = v.id
JOIN comissao_parcelas p ON p.venda_id = v.id
LEFT JOIN comissao_matriz m ON m.parcela_id = p.id AND m.corretor_id = c.id
ORDER BY v.id, c.grupo, c.prioridade DESC, c.nome, p.numero;

-- ============================================================================
-- 8. SEED: Beneficiários Padrão da PRT (Exemplo)
-- ============================================================================

-- Inserir beneficiários padrão para workspace 1 (ajustar conforme necessário)
INSERT INTO comissao_beneficiarios_padrao (workspace_id, grupo, cargo, nome, percentual_vgv, ordem)
SELECT 1, 'prt', 'gerente_produto', '', 0.0030, 1
WHERE NOT EXISTS (SELECT 1 FROM comissao_beneficiarios_padrao WHERE workspace_id = 1 AND cargo = 'gerente_produto');

INSERT INTO comissao_beneficiarios_padrao (workspace_id, grupo, cargo, nome, percentual_vgv, ordem)
SELECT 1, 'prt', 'gerente_pratica', '', 0.0040, 2
WHERE NOT EXISTS (SELECT 1 FROM comissao_beneficiarios_padrao WHERE workspace_id = 1 AND cargo = 'gerente_pratica');

INSERT INTO comissao_beneficiarios_padrao (workspace_id, grupo, cargo, nome, percentual_vgv, ordem)
SELECT 1, 'prt', 'coordenador_1', '', 0.0015, 3
WHERE NOT EXISTS (SELECT 1 FROM comissao_beneficiarios_padrao WHERE workspace_id = 1 AND cargo = 'coordenador_1');

INSERT INTO comissao_beneficiarios_padrao (workspace_id, grupo, cargo, nome, percentual_vgv, ordem)
SELECT 1, 'prt', 'coordenador_2', '', 0.0015, 4
WHERE NOT EXISTS (SELECT 1 FROM comissao_beneficiarios_padrao WHERE workspace_id = 1 AND cargo = 'coordenador_2');

INSERT INTO comissao_beneficiarios_padrao (workspace_id, grupo, cargo, nome, percentual_vgv, ordem)
SELECT 1, 'prt', 'secretaria', '', 0.0005, 5
WHERE NOT EXISTS (SELECT 1 FROM comissao_beneficiarios_padrao WHERE workspace_id = 1 AND cargo = 'secretaria');

INSERT INTO comissao_beneficiarios_padrao (workspace_id, grupo, cargo, nome, percentual_vgv, ordem)
SELECT 1, 'prt', 'tributos', '', 0.0010, 6
WHERE NOT EXISTS (SELECT 1 FROM comissao_beneficiarios_padrao WHERE workspace_id = 1 AND cargo = 'tributos');

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE comissao_grupos IS 'Divisão da comissão em grupos (IMOB/PRT) por venda';
COMMENT ON TABLE comissao_beneficiarios_padrao IS 'Templates de beneficiários padrão para sugestão automática';
COMMENT ON COLUMN comissao_corretores.documento IS 'CPF ou CNPJ do beneficiário';
COMMENT ON COLUMN comissao_corretores.grupo IS 'Grupo ao qual pertence: imob (imobiliária) ou prt (prática)';
COMMENT ON COLUMN comissao_corretores.cargo IS 'Cargo/função do beneficiário';
COMMENT ON COLUMN comissao_corretores.percentual_vgv IS 'Percentual sobre o VGV (0.0035 = 0,35%)';
COMMENT ON COLUMN comissao_matriz.valor_manual IS 'Valor digitado manualmente, sobrescreve o calculado';
COMMENT ON COLUMN comissao_matriz.editado_manualmente IS 'Indica se o valor foi editado manualmente';
COMMENT ON FUNCTION fn_calcular_matriz_comissao_v2 IS 'Calcula matriz preservando valores manuais';
