/**
 * @fileoverview Queries SQL reutilizaveis para o Sistema de Intermediacao Imobiliaria
 * @module lib/intermediacao/queries
 * @description Queries base para vendas, beneficiarios, parcelas e pagamentos
 * com joins e agregacoes comuns.
 */

// =============================================================================
// QUERIES DE VENDAS
// =============================================================================

/**
 * Query base para vendas com informacoes completas
 * Inclui distribuicoes e beneficiarios
 */
export const VENDA_QUERY_BASE = `
SELECT
  v.id,
  v.codigo,
  v.valor_total,
  v.unidade,
  v.empreendimento,
  v.cliente_nome,
  v.cliente_cpf,
  v.cliente_email,
  v.cliente_telefone,
  v.data_venda,
  v.percentual_intermediacao,
  v.valor_comissao,
  v.status,
  v.descricao,
  v.workspace_id,
  v.criado_por,
  v.created_at,
  v.updated_at,
  -- Totais agregados
  COALESCE(SUM(d.valor), 0) as total_distribuido,
  COALESCE(SUM(
    CASE WHEN p.status = 'paga' THEN p.valor ELSE 0 END
  ), 0) as total_pago,
  COUNT(DISTINCT d.id) as quantidade_beneficiarios,
  COUNT(DISTINCT par.id) as quantidade_parcelas,
  COUNT(DISTINCT CASE WHEN par.status = 'paga' THEN par.id END) as parcelas_pagas
FROM vendas_intermediacao v
LEFT JOIN distribuicoes_comissao d ON d.venda_id = v.id
LEFT JOIN beneficiarios b ON b.id = d.beneficiario_id
LEFT JOIN parcelas par ON par.distribuicao_id = d.id
LEFT JOIN pagamentos p ON p.parcela_id = par.id AND p.status = 'confirmado'
`;

/**
 * Clausula GROUP BY para query de vendas
 */
export const VENDA_GROUP_BY = `
GROUP BY
  v.id, v.codigo, v.valor_total, v.unidade, v.empreendimento,
  v.cliente_nome, v.cliente_cpf, v.cliente_email, v.cliente_telefone,
  v.data_venda, v.percentual_intermediacao, v.valor_comissao,
  v.status, v.descricao, v.workspace_id, v.criado_por, v.created_at, v.updated_at
`;

/**
 * Query para buscar venda por ID com todos os relacionamentos
 */
export const VENDA_QUERY_BY_ID = `
SELECT
  v.*,
  json_agg(DISTINCT jsonb_build_object(
    'id', d.id,
    'beneficiario_id', d.beneficiario_id,
    'percentual', d.percentual,
    'valor', d.valor,
    'observacao', d.observacao,
    'beneficiario', jsonb_build_object(
      'id', b.id,
      'codigo', b.codigo,
      'nome', b.nome,
      'tipo_documento', b.tipo_documento,
      'documento', b.documento,
      'tipo', b.tipo
    )
  )) FILTER (WHERE d.id IS NOT NULL) as distribuicoes
FROM vendas_intermediacao v
LEFT JOIN distribuicoes_comissao d ON d.venda_id = v.id
LEFT JOIN beneficiarios b ON b.id = d.beneficiario_id
WHERE v.id = $1
GROUP BY v.id
`;

/**
 * Query para listar vendas com filtros
 */
export const VENDA_QUERY_LIST = `
${VENDA_QUERY_BASE}
WHERE v.workspace_id = $1
  AND ($2::text IS NULL OR v.status = $2)
  AND ($3::text IS NULL OR v.empreendimento ILIKE '%' || $3 || '%')
  AND ($4::date IS NULL OR v.data_venda >= $4)
  AND ($5::date IS NULL OR v.data_venda <= $5)
${VENDA_GROUP_BY}
ORDER BY v.data_venda DESC, v.created_at DESC
LIMIT $6 OFFSET $7
`;

/**
 * Query para contar vendas com filtros
 */
export const VENDA_COUNT_QUERY = `
SELECT COUNT(DISTINCT v.id) as total
FROM vendas_intermediacao v
WHERE v.workspace_id = $1
  AND ($2::text IS NULL OR v.status = $2)
  AND ($3::text IS NULL OR v.empreendimento ILIKE '%' || $3 || '%')
  AND ($4::date IS NULL OR v.data_venda >= $4)
  AND ($5::date IS NULL OR v.data_venda <= $5)
`;

// =============================================================================
// QUERIES DE BENEFICIARIOS
// =============================================================================

/**
 * Query base para beneficiarios com totais agregados
 */
export const BENEFICIARIO_QUERY_BASE = `
SELECT
  b.id,
  b.codigo,
  b.nome,
  b.tipo_documento,
  b.documento,
  b.tipo,
  b.email,
  b.telefone,
  b.banco,
  b.agencia,
  b.conta,
  b.tipo_conta,
  b.chave_pix,
  b.ativo,
  b.workspace_id,
  b.created_at,
  b.updated_at,
  -- Totais agregados
  COUNT(DISTINCT d.venda_id) as total_vendas,
  COALESCE(SUM(d.valor), 0) as valor_total_comissoes,
  COALESCE(SUM(
    CASE WHEN p.status = 'paga' THEN par.valor ELSE 0 END
  ), 0) as valor_recebido,
  COALESCE(SUM(
    CASE WHEN par.status IN ('pendente', 'atrasada') THEN par.valor ELSE 0 END
  ), 0) as valor_a_receber
FROM beneficiarios b
LEFT JOIN distribuicoes_comissao d ON d.beneficiario_id = b.id
LEFT JOIN parcelas par ON par.distribuicao_id = d.id
LEFT JOIN pagamentos p ON p.parcela_id = par.id AND p.status = 'confirmado'
`;

/**
 * Clausula GROUP BY para query de beneficiarios
 */
export const BENEFICIARIO_GROUP_BY = `
GROUP BY
  b.id, b.codigo, b.nome, b.tipo_documento, b.documento, b.tipo,
  b.email, b.telefone, b.banco, b.agencia, b.conta, b.tipo_conta,
  b.chave_pix, b.ativo, b.workspace_id, b.created_at, b.updated_at
`;

/**
 * Query para listar beneficiarios com filtros
 */
export const BENEFICIARIO_QUERY_LIST = `
${BENEFICIARIO_QUERY_BASE}
WHERE b.workspace_id = $1
  AND ($2::boolean IS NULL OR b.ativo = $2)
  AND ($3::text IS NULL OR b.tipo = $3)
  AND ($4::text IS NULL OR b.nome ILIKE '%' || $4 || '%' OR b.documento LIKE '%' || $4 || '%')
${BENEFICIARIO_GROUP_BY}
ORDER BY b.nome ASC
LIMIT $5 OFFSET $6
`;

/**
 * Query para buscar beneficiario por documento
 */
export const BENEFICIARIO_QUERY_BY_DOCUMENTO = `
SELECT * FROM beneficiarios
WHERE workspace_id = $1 AND documento = $2
LIMIT 1
`;

// =============================================================================
// QUERIES DE PARCELAS
// =============================================================================

/**
 * Query base para parcelas com informacoes da venda e beneficiario
 */
export const PARCELA_QUERY_BASE = `
SELECT
  par.id,
  par.distribuicao_id,
  par.numero,
  par.valor,
  par.data_vencimento,
  par.data_pagamento,
  par.status,
  par.observacao,
  par.created_at,
  par.updated_at,
  -- Dados da distribuicao
  d.percentual as distribuicao_percentual,
  d.valor as distribuicao_valor,
  -- Dados do beneficiario
  b.id as beneficiario_id,
  b.codigo as beneficiario_codigo,
  b.nome as beneficiario_nome,
  b.tipo as beneficiario_tipo,
  -- Dados da venda
  v.id as venda_id,
  v.codigo as venda_codigo,
  v.empreendimento as venda_empreendimento,
  v.unidade as venda_unidade,
  v.cliente_nome as venda_cliente,
  -- Total pago
  COALESCE(SUM(pg.valor) FILTER (WHERE pg.status = 'confirmado'), 0) as total_pago
FROM parcelas par
INNER JOIN distribuicoes_comissao d ON d.id = par.distribuicao_id
INNER JOIN beneficiarios b ON b.id = d.beneficiario_id
INNER JOIN vendas_intermediacao v ON v.id = d.venda_id
LEFT JOIN pagamentos pg ON pg.parcela_id = par.id
`;

/**
 * Clausula GROUP BY para query de parcelas
 */
export const PARCELA_GROUP_BY = `
GROUP BY
  par.id, par.distribuicao_id, par.numero, par.valor, par.data_vencimento,
  par.data_pagamento, par.status, par.observacao, par.created_at, par.updated_at,
  d.percentual, d.valor,
  b.id, b.codigo, b.nome, b.tipo,
  v.id, v.codigo, v.empreendimento, v.unidade, v.cliente_nome
`;

/**
 * Query para listar parcelas com filtros
 */
export const PARCELA_QUERY_LIST = `
${PARCELA_QUERY_BASE}
WHERE v.workspace_id = $1
  AND ($2::text IS NULL OR par.status = $2)
  AND ($3::uuid IS NULL OR b.id = $3)
  AND ($4::uuid IS NULL OR v.id = $4)
  AND ($5::date IS NULL OR par.data_vencimento >= $5)
  AND ($6::date IS NULL OR par.data_vencimento <= $6)
${PARCELA_GROUP_BY}
ORDER BY par.data_vencimento ASC, par.numero ASC
LIMIT $7 OFFSET $8
`;

/**
 * Query para parcelas atrasadas
 */
export const PARCELA_QUERY_ATRASADAS = `
${PARCELA_QUERY_BASE}
WHERE v.workspace_id = $1
  AND par.status IN ('pendente', 'atrasada')
  AND par.data_vencimento < CURRENT_DATE
${PARCELA_GROUP_BY}
ORDER BY par.data_vencimento ASC
`;

/**
 * Query para parcelas a vencer nos proximos N dias
 */
export const PARCELA_QUERY_A_VENCER = `
${PARCELA_QUERY_BASE}
WHERE v.workspace_id = $1
  AND par.status = 'pendente'
  AND par.data_vencimento >= CURRENT_DATE
  AND par.data_vencimento <= CURRENT_DATE + $2::integer
${PARCELA_GROUP_BY}
ORDER BY par.data_vencimento ASC
`;

// =============================================================================
// QUERIES DE PAGAMENTOS
// =============================================================================

/**
 * Query base para pagamentos com informacoes relacionadas
 */
export const PAGAMENTO_QUERY_BASE = `
SELECT
  pg.id,
  pg.parcela_id,
  pg.valor,
  pg.data_pagamento,
  pg.forma_pagamento,
  pg.comprovante,
  pg.status,
  pg.observacao,
  pg.registrado_por,
  pg.created_at,
  pg.updated_at,
  -- Dados da parcela
  par.numero as parcela_numero,
  par.valor as parcela_valor,
  par.data_vencimento as parcela_vencimento,
  -- Dados do beneficiario
  b.id as beneficiario_id,
  b.nome as beneficiario_nome,
  -- Dados da venda
  v.id as venda_id,
  v.codigo as venda_codigo,
  v.empreendimento as venda_empreendimento
FROM pagamentos pg
INNER JOIN parcelas par ON par.id = pg.parcela_id
INNER JOIN distribuicoes_comissao d ON d.id = par.distribuicao_id
INNER JOIN beneficiarios b ON b.id = d.beneficiario_id
INNER JOIN vendas_intermediacao v ON v.id = d.venda_id
`;

/**
 * Query para listar pagamentos com filtros
 */
export const PAGAMENTO_QUERY_LIST = `
${PAGAMENTO_QUERY_BASE}
WHERE v.workspace_id = $1
  AND ($2::text IS NULL OR pg.status = $2)
  AND ($3::uuid IS NULL OR b.id = $3)
  AND ($4::date IS NULL OR pg.data_pagamento >= $4)
  AND ($5::date IS NULL OR pg.data_pagamento <= $5)
ORDER BY pg.data_pagamento DESC, pg.created_at DESC
LIMIT $6 OFFSET $7
`;

// =============================================================================
// QUERIES DE RELATORIOS
// =============================================================================

/**
 * Query para resumo geral por periodo
 */
export const RELATORIO_RESUMO_PERIODO = `
SELECT
  DATE_TRUNC('month', v.data_venda) as periodo,
  COUNT(DISTINCT v.id) as total_vendas,
  SUM(v.valor_total) as valor_total_vendas,
  SUM(v.valor_comissao) as valor_total_comissoes,
  AVG(v.percentual_intermediacao) as percentual_medio
FROM vendas_intermediacao v
WHERE v.workspace_id = $1
  AND v.data_venda >= $2
  AND v.data_venda <= $3
GROUP BY DATE_TRUNC('month', v.data_venda)
ORDER BY periodo DESC
`;

/**
 * Query para ranking de beneficiarios
 */
export const RELATORIO_RANKING_BENEFICIARIOS = `
SELECT
  b.id,
  b.nome,
  b.tipo,
  COUNT(DISTINCT d.venda_id) as total_vendas,
  SUM(d.valor) as valor_total,
  SUM(CASE WHEN par.status = 'paga' THEN par.valor ELSE 0 END) as valor_recebido
FROM beneficiarios b
INNER JOIN distribuicoes_comissao d ON d.beneficiario_id = b.id
INNER JOIN vendas_intermediacao v ON v.id = d.venda_id
LEFT JOIN parcelas par ON par.distribuicao_id = d.id
WHERE b.workspace_id = $1
  AND v.data_venda >= $2
  AND v.data_venda <= $3
GROUP BY b.id, b.nome, b.tipo
ORDER BY valor_total DESC
LIMIT $4
`;

/**
 * Query para fluxo de caixa projetado
 */
export const RELATORIO_FLUXO_CAIXA = `
SELECT
  DATE_TRUNC('month', par.data_vencimento) as periodo,
  SUM(CASE WHEN par.status = 'pendente' THEN par.valor ELSE 0 END) as valor_pendente,
  SUM(CASE WHEN par.status = 'atrasada' THEN par.valor ELSE 0 END) as valor_atrasado,
  SUM(CASE WHEN par.status = 'paga' THEN par.valor ELSE 0 END) as valor_pago
FROM parcelas par
INNER JOIN distribuicoes_comissao d ON d.id = par.distribuicao_id
INNER JOIN vendas_intermediacao v ON v.id = d.venda_id
WHERE v.workspace_id = $1
  AND par.data_vencimento >= $2
  AND par.data_vencimento <= $3
GROUP BY DATE_TRUNC('month', par.data_vencimento)
ORDER BY periodo ASC
`;

// =============================================================================
// QUERIES DE AUDITORIA
// =============================================================================

/**
 * Query para logs de auditoria
 */
export const AUDITORIA_QUERY_LIST = `
SELECT
  la.id,
  la.tabela,
  la.registro_id,
  la.operacao,
  la.dados_anteriores,
  la.dados_novos,
  la.campos_alterados,
  la.usuario_id,
  la.usuario_nome,
  la.justificativa,
  la.ip,
  la.created_at
FROM logs_auditoria la
WHERE ($1::text IS NULL OR la.tabela = $1)
  AND ($2::uuid IS NULL OR la.registro_id::text = $2::text)
  AND ($3::text IS NULL OR la.operacao = $3)
  AND ($4::uuid IS NULL OR la.usuario_id = $4)
  AND ($5::timestamp IS NULL OR la.created_at >= $5)
  AND ($6::timestamp IS NULL OR la.created_at <= $6)
ORDER BY la.created_at DESC
LIMIT $7 OFFSET $8
`;

/**
 * Query para historico de alteracoes de um registro
 */
export const AUDITORIA_HISTORICO_REGISTRO = `
SELECT
  la.id,
  la.operacao,
  la.dados_anteriores,
  la.dados_novos,
  la.campos_alterados,
  la.usuario_nome,
  la.justificativa,
  la.created_at
FROM logs_auditoria la
WHERE la.tabela = $1 AND la.registro_id::text = $2::text
ORDER BY la.created_at DESC
`;
