/**
 * @fileoverview Funcoes de auditoria para o Sistema de Intermediacao Imobiliaria
 * @module lib/intermediacao/audit
 * @description Funcoes para criar logs de auditoria, detectar alteracoes
 * e identificar operacoes criticas.
 */

import type { LogAuditoriaCreateInput, OperacaoAuditoria } from './types';

// =============================================================================
// CONFIGURACAO
// =============================================================================

/**
 * Tabelas que requerem auditoria completa
 */
const TABELAS_AUDITADAS = [
  'vendas_intermediacao',
  'beneficiarios',
  'distribuicoes_comissao',
  'parcelas',
  'pagamentos',
];

/**
 * Operacoes consideradas criticas por tabela
 */
const OPERACOES_CRITICAS: Record<string, string[]> = {
  vendas_intermediacao: ['delete', 'update:status', 'update:valor_total', 'update:percentual_intermediacao'],
  beneficiarios: ['delete', 'update:documento'],
  distribuicoes_comissao: ['delete', 'update:percentual', 'update:valor'],
  parcelas: ['delete', 'update:valor', 'update:status'],
  pagamentos: ['delete', 'update:valor', 'update:status'],
};

/**
 * Campos sensiveis que nao devem ser logados em texto claro
 */
const CAMPOS_SENSIVEIS = [
  'senha',
  'password',
  'token',
  'secret',
  'chave_api',
];

// =============================================================================
// DETECCAO DE ALTERACOES
// =============================================================================

/**
 * Detecta quais campos foram alterados entre dois objetos
 * @param antes - Objeto com dados antes da alteracao
 * @param depois - Objeto com dados apos a alteracao
 * @returns Array com nomes dos campos alterados
 *
 * @example
 * detectarCamposAlterados(
 *   { nome: 'Joao', email: 'joao@email.com' },
 *   { nome: 'Joao Silva', email: 'joao@email.com' }
 * ) // ['nome']
 */
export function detectarCamposAlterados(
  antes: Record<string, unknown>,
  depois: Record<string, unknown>
): string[] {
  const camposAlterados: string[] = [];

  // Pega todas as chaves unicas de ambos os objetos
  const todasChaves = Array.from(new Set([
    ...Object.keys(antes || {}),
    ...Object.keys(depois || {}),
  ]));

  for (const chave of todasChaves) {
    // Ignora campos de metadados que sao atualizados automaticamente
    if (['updated_at', 'created_at'].includes(chave)) continue;

    const valorAntes = antes?.[chave];
    const valorDepois = depois?.[chave];

    // Compara valores (tratando null e undefined como equivalentes)
    if (!valoresIguais(valorAntes, valorDepois)) {
      camposAlterados.push(chave);
    }
  }

  return camposAlterados;
}

/**
 * Compara dois valores para igualdade profunda
 * @param a - Primeiro valor
 * @param b - Segundo valor
 * @returns true se os valores sao iguais
 */
function valoresIguais(a: unknown, b: unknown): boolean {
  // Trata null e undefined como equivalentes
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // Compara tipos primitivos
  if (typeof a !== typeof b) return false;

  // Compara objetos e arrays por JSON
  if (typeof a === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return a === b;
}

/**
 * Filtra campos sensiveis dos dados antes de logar
 * @param dados - Objeto com dados a filtrar
 * @returns Objeto com campos sensiveis mascarados
 */
export function filtrarCamposSensiveis(
  dados: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!dados) return dados;

  const filtrado: Record<string, unknown> = {};

  for (const [chave, valor] of Object.entries(dados)) {
    if (CAMPOS_SENSIVEIS.some(sensivel => chave.toLowerCase().includes(sensivel))) {
      filtrado[chave] = '[REDACTED]';
    } else if (typeof valor === 'object' && valor !== null && !Array.isArray(valor)) {
      filtrado[chave] = filtrarCamposSensiveis(valor as Record<string, unknown>);
    } else {
      filtrado[chave] = valor;
    }
  }

  return filtrado;
}

// =============================================================================
// OPERACOES CRITICAS
// =============================================================================

/**
 * Verifica se uma operacao e considerada critica
 * @param operacao - Tipo de operacao (create, update, delete)
 * @param tabela - Nome da tabela
 * @param dados - Dados da operacao (para verificar campos especificos em updates)
 * @returns true se a operacao e critica
 *
 * @example
 * isOperacaoCritica('delete', 'vendas_intermediacao') // true
 * isOperacaoCritica('update', 'vendas_intermediacao', { status: 'paga' }) // true
 * isOperacaoCritica('update', 'vendas_intermediacao', { descricao: 'teste' }) // false
 */
export function isOperacaoCritica(
  operacao: OperacaoAuditoria,
  tabela: string,
  dados?: Record<string, unknown>
): boolean {
  const operacoesCriticas = OPERACOES_CRITICAS[tabela];

  if (!operacoesCriticas) return false;

  // Delete sempre e critico se a tabela tiver operacoes criticas
  if (operacao === 'delete') {
    return operacoesCriticas.includes('delete');
  }

  // Para updates, verifica se os campos alterados sao criticos
  if (operacao === 'update' && dados) {
    const camposAlterados = Object.keys(dados);

    for (const campo of camposAlterados) {
      if (operacoesCriticas.includes(`update:${campo}`)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Retorna descricao da criticidade da operacao
 * @param operacao - Tipo de operacao
 * @param tabela - Nome da tabela
 * @param camposAlterados - Lista de campos alterados
 * @returns Descricao da criticidade ou null se nao critica
 */
export function descreverCriticidade(
  operacao: OperacaoAuditoria,
  tabela: string,
  camposAlterados?: string[]
): string | null {
  if (operacao === 'delete') {
    switch (tabela) {
      case 'vendas_intermediacao':
        return 'Exclusao de venda - operacao irreversivel que remove dados financeiros';
      case 'beneficiarios':
        return 'Exclusao de beneficiario - pode afetar historico de comissoes';
      case 'distribuicoes_comissao':
        return 'Exclusao de distribuicao - altera divisao de comissoes';
      case 'parcelas':
        return 'Exclusao de parcela - impacta cronograma de pagamentos';
      case 'pagamentos':
        return 'Exclusao de pagamento - afeta historico financeiro';
      default:
        return 'Exclusao de registro';
    }
  }

  if (operacao === 'update' && camposAlterados) {
    const criticosCampos = camposAlterados.filter(campo =>
      OPERACOES_CRITICAS[tabela]?.includes(`update:${campo}`)
    );

    if (criticosCampos.length > 0) {
      return `Alteracao de campo(s) critico(s): ${criticosCampos.join(', ')}`;
    }
  }

  return null;
}

// =============================================================================
// CRIACAO DE LOGS
// =============================================================================

/**
 * Prepara os parametros para criacao de log de auditoria
 * @param params - Parametros base do log
 * @returns Parametros processados para salvar
 */
export function prepararLogAuditoria(params: LogAuditoriaCreateInput): LogAuditoriaCreateInput {
  return {
    ...params,
    dados_anteriores: filtrarCamposSensiveis(params.dados_anteriores),
    dados_novos: filtrarCamposSensiveis(params.dados_novos),
    campos_alterados: params.campos_alterados ||
      (params.dados_anteriores && params.dados_novos
        ? detectarCamposAlterados(params.dados_anteriores, params.dados_novos)
        : undefined),
  };
}

/**
 * Cria log de auditoria no banco de dados
 * @param params - Parametros do log
 * @description Esta funcao deve ser importada com a conexao do banco de dados
 *
 * @example
 * await criarLogAuditoria({
 *   tabela: 'vendas_intermediacao',
 *   registro_id: '123',
 *   operacao: 'update',
 *   dados_anteriores: { status: 'rascunho' },
 *   dados_novos: { status: 'em_processamento' },
 *   usuario_id: 'user-123',
 *   usuario_nome: 'Joao Silva',
 * });
 */
export async function criarLogAuditoria(params: LogAuditoriaCreateInput): Promise<void> {
  const logPreparado = prepararLogAuditoria(params);

  // Verifica se e operacao critica
  const critico = isOperacaoCritica(
    params.operacao,
    params.tabela,
    params.dados_novos
  );

  // Se for critico e nao tiver justificativa, lanca erro
  if (critico && !params.justificativa) {
    const descricao = descreverCriticidade(
      params.operacao,
      params.tabela,
      params.campos_alterados
    );
    console.warn(`[AUDIT] Operacao critica sem justificativa: ${descricao}`);
  }

  // Log para desenvolvimento/debug
  console.log('[AUDIT]', {
    tabela: logPreparado.tabela,
    registro_id: logPreparado.registro_id,
    operacao: logPreparado.operacao,
    campos_alterados: logPreparado.campos_alterados,
    usuario: logPreparado.usuario_nome,
    critico,
  });

  // NOTA: A insercao real no banco deve ser feita na camada de servico
  // que tem acesso ao cliente do banco de dados (Supabase, Prisma, etc)
  // Esta funcao serve como preparacao e validacao dos dados
}

/**
 * Gera resumo de auditoria para exibicao
 * @param log - Log de auditoria
 * @returns Texto resumido da alteracao
 */
export function gerarResumoAuditoria(log: LogAuditoriaCreateInput): string {
  const operacaoTexto = {
    create: 'criou',
    update: 'alterou',
    delete: 'excluiu',
  }[log.operacao];

  const tabelaTexto = {
    vendas_intermediacao: 'venda',
    beneficiarios: 'beneficiario',
    distribuicoes_comissao: 'distribuicao',
    parcelas: 'parcela',
    pagamentos: 'pagamento',
  }[log.tabela] || log.tabela;

  let resumo = `${log.usuario_nome} ${operacaoTexto} ${tabelaTexto}`;

  if (log.operacao === 'update' && log.campos_alterados?.length) {
    resumo += `: ${log.campos_alterados.join(', ')}`;
  }

  return resumo;
}

// =============================================================================
// CONSULTAS DE AUDITORIA
// =============================================================================

/**
 * Gera SQL para buscar logs de auditoria
 * @param filtros - Filtros de busca
 * @returns Query SQL parametrizada
 */
export function gerarQueryAuditoria(filtros: {
  tabela?: string;
  registro_id?: string;
  operacao?: OperacaoAuditoria;
  usuario_id?: string;
  data_inicio?: string;
  data_fim?: string;
  apenas_criticos?: boolean;
}): { sql: string; params: unknown[] } {
  const condicoes: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filtros.tabela) {
    condicoes.push(`tabela = $${paramIndex++}`);
    params.push(filtros.tabela);
  }

  if (filtros.registro_id) {
    condicoes.push(`registro_id = $${paramIndex++}`);
    params.push(filtros.registro_id);
  }

  if (filtros.operacao) {
    condicoes.push(`operacao = $${paramIndex++}`);
    params.push(filtros.operacao);
  }

  if (filtros.usuario_id) {
    condicoes.push(`usuario_id = $${paramIndex++}`);
    params.push(filtros.usuario_id);
  }

  if (filtros.data_inicio) {
    condicoes.push(`created_at >= $${paramIndex++}`);
    params.push(filtros.data_inicio);
  }

  if (filtros.data_fim) {
    condicoes.push(`created_at <= $${paramIndex++}`);
    params.push(filtros.data_fim);
  }

  if (filtros.apenas_criticos) {
    condicoes.push(`justificativa IS NOT NULL`);
  }

  const whereClause = condicoes.length > 0
    ? `WHERE ${condicoes.join(' AND ')}`
    : '';

  const sql = `
    SELECT *
    FROM logs_auditoria
    ${whereClause}
    ORDER BY created_at DESC
  `;

  return { sql, params };
}

/**
 * Verifica se a tabela requer auditoria
 * @param tabela - Nome da tabela
 * @returns true se a tabela requer auditoria
 */
export function tabelaRequerAuditoria(tabela: string): boolean {
  return TABELAS_AUDITADAS.includes(tabela);
}
