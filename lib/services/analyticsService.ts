/**
 * Serviço de Analytics
 * Funções auxiliares para cálculos e agregações de métricas
 */

import { dbQuery } from '@/lib/db';

export type PeriodoAnalytics = '7d' | '30d' | '90d' | 'all';

/**
 * Converte período em filtro SQL
 */
export function getPeriodoFilter(periodo: PeriodoAnalytics = '30d'): string {
  const periodoMap: Record<PeriodoAnalytics, string> = {
    '7d': "AND created_at >= NOW() - INTERVAL '7 days'",
    '30d': "AND created_at >= NOW() - INTERVAL '30 days'",
    '90d': "AND created_at >= NOW() - INTERVAL '90 days'",
    'all': '',
  };
  return periodoMap[periodo] || periodoMap['30d'];
}

/**
 * Calcula resumo geral de métricas
 */
export async function getResumoGeral(corretor_id?: string) {
  const corretorFilter = corretor_id ? 'AND l.user_id = $1' : '';
  const params = corretor_id ? [corretor_id] : [];

  const { rows: leadsRows } = await dbQuery(
    `
    SELECT 
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE temperature = 'hot') as leads_hot,
      COUNT(*) FILTER (WHERE temperature = 'warm') as leads_warm,
      COUNT(*) FILTER (WHERE score >= 80) as leads_qualificados,
      AVG(score) as score_medio
    FROM leads l
    WHERE 1=1 ${corretorFilter}
    `,
    params
  );

  const { rows: agendamentosRows } = await dbQuery(
    `
    SELECT 
      COUNT(*) as total_agendamentos,
      COUNT(*) FILTER (WHERE status = 'realizado') as realizados,
      COUNT(*) FILTER (WHERE status = 'pendente') as pendentes
    FROM agendamentos a
    ${corretor_id ? 'WHERE a.corretor_id = $1' : ''}
    `,
    params
  );

  const { rows: simulacoesRows } = await dbQuery(
    `
    SELECT 
      COUNT(*) as total_simulacoes,
      COUNT(*) FILTER (WHERE cliente_interessado = TRUE) as com_interesse
    FROM simulacoes s
    ${corretor_id ? 'WHERE s.corretor_id = $1' : ''}
    `,
    params
  );

  const { rows: notificacoesRows } = await dbQuery(
    `
    SELECT 
      COUNT(*) FILTER (WHERE lida = FALSE) as nao_lidas
    FROM notificacoes n
    ${corretor_id ? 'WHERE n.corretor_id = $1' : ''}
    `,
    params
  );

  const leads = leadsRows[0];
  const agendamentos = agendamentosRows[0];
  const simulacoes = simulacoesRows[0];
  const notificacoes = notificacoesRows[0];

  return {
    leads: {
      total: parseInt(leads.total_leads, 10),
      hot: parseInt(leads.leads_hot, 10),
      warm: parseInt(leads.leads_warm, 10),
      qualificados: parseInt(leads.leads_qualificados, 10),
      score_medio: parseFloat(leads.score_medio || 0),
    },
    agendamentos: {
      total: parseInt(agendamentos.total_agendamentos, 10),
      realizados: parseInt(agendamentos.realizados, 10),
      pendentes: parseInt(agendamentos.pendentes, 10),
      taxa_realizacao:
        parseInt(agendamentos.total_agendamentos, 10) > 0
          ? (parseInt(agendamentos.realizados, 10) / parseInt(agendamentos.total_agendamentos, 10)) * 100
          : 0,
    },
    simulacoes: {
      total: parseInt(simulacoes.total_simulacoes, 10),
      com_interesse: parseInt(simulacoes.com_interesse, 10),
      taxa_interesse:
        parseInt(simulacoes.total_simulacoes, 10) > 0
          ? (parseInt(simulacoes.com_interesse, 10) / parseInt(simulacoes.total_simulacoes, 10)) * 100
          : 0,
    },
    notificacoes: {
      nao_lidas: parseInt(notificacoes.nao_lidas, 10),
    },
  };
}

/**
 * Calcula score de um lead baseado em suas ações
 */
export function calcularScoreLead(dados: {
  tem_telefone?: boolean;
  tem_email?: boolean;
  numero_interacoes?: number;
  fez_simulacao?: boolean;
  agendou_visita?: boolean;
  realizou_visita?: boolean;
  respondeu_followup?: boolean;
  interesse_declarado?: boolean;
}): number {
  let score = 0;

  // Dados de contato
  if (dados.tem_telefone) score += 10;
  if (dados.tem_email) score += 5;

  // Engajamento
  if (dados.numero_interacoes) {
    score += Math.min(dados.numero_interacoes * 5, 20); // Max 20 pontos
  }

  // Ações importantes
  if (dados.interesse_declarado) score += 15;
  if (dados.fez_simulacao) score += 15;
  if (dados.agendou_visita) score += 20;
  if (dados.realizou_visita) score += 25;
  if (dados.respondeu_followup) score += 10;

  return Math.min(score, 100);
}

/**
 * Identifica leads que precisam de follow-up
 */
export async function getLeadsParaFollowup(corretor_id?: string) {
  const corretorFilter = corretor_id ? 'AND l.user_id = $1' : '';
  const params = corretor_id ? [corretor_id] : [];

  // Leads sem interação nos últimos 5 dias
  const { rows } = await dbQuery(
    `
    SELECT 
      l.*,
      EXTRACT(EPOCH FROM (NOW() - l.last_interaction_at)) / 86400 as dias_sem_interacao,
      (SELECT COUNT(*) FROM followups f WHERE f.lead_id = l.id) as total_followups
    FROM leads l
    WHERE (l.last_interaction_at IS NULL OR l.last_interaction_at < NOW() - INTERVAL '5 days')
      AND l.temperature IN ('warm', 'hot')
      AND l.score >= 40
      ${corretorFilter}
    ORDER BY l.score DESC, l.last_interaction_at ASC
    LIMIT 50
    `,
    params
  );

  return rows.map((row) => ({
    ...row,
    dias_sem_interacao: parseFloat(row.dias_sem_interacao || 0),
    total_followups: parseInt(row.total_followups, 10),
    prioridade: row.score >= 70 ? 'alta' : row.score >= 50 ? 'media' : 'baixa',
  }));
}

/**
 * Gera relatório de performance do corretor
 */
export async function getPerformanceCorretor(corretor_id: string, periodo: PeriodoAnalytics = '30d') {
  const dateFilter = getPeriodoFilter(periodo);

  const resumo = await getResumoGeral(corretor_id);

  // Tendências (comparar com período anterior)
  const periodoAnterior = periodo === '7d' ? '14 days' : periodo === '30d' ? '60 days' : '180 days';

  const { rows: tendenciaRows } = await dbQuery(
    `
    SELECT 
      COUNT(*) FILTER (WHERE l.created_at >= NOW() - INTERVAL '${periodo}') as leads_atual,
      COUNT(*) FILTER (
        WHERE l.created_at >= NOW() - INTERVAL '${periodoAnterior}' 
          AND l.created_at < NOW() - INTERVAL '${periodo}'
      ) as leads_anterior
    FROM leads l
    WHERE l.user_id = $1
    `,
    [corretor_id]
  );

  const tendencia = tendenciaRows[0];
  const variacao_leads =
    parseInt(tendencia.leads_anterior, 10) > 0
      ? ((parseInt(tendencia.leads_atual, 10) - parseInt(tendencia.leads_anterior, 10)) /
          parseInt(tendencia.leads_anterior, 10)) *
        100
      : 0;

  return {
    periodo,
    resumo,
    tendencia: {
      leads: {
        atual: parseInt(tendencia.leads_atual, 10),
        anterior: parseInt(tendencia.leads_anterior, 10),
        variacao_percentual: parseFloat(variacao_leads.toFixed(2)),
      },
    },
  };
}

/**
 * Exporta dados para relatório (CSV, Excel, etc)
 */
export async function exportarDadosRelatorio(
  tipo: 'leads' | 'agendamentos' | 'simulacoes',
  periodo: PeriodoAnalytics = '30d',
  corretor_id?: string
) {
  const dateFilter = getPeriodoFilter(periodo);
  const corretorFilter = corretor_id ? 'AND user_id = $1' : '';
  const params = corretor_id ? [corretor_id] : [];

  let query = '';

  switch (tipo) {
    case 'leads':
      query = `
        SELECT 
          l.id, l.name, l.phone, l.email, l.score, l.temperature,
          l.source, l.created_at, l.last_interaction_at,
          (SELECT COUNT(*) FROM agendamentos a WHERE a.lead_id = l.id) as total_agendamentos,
          (SELECT COUNT(*) FROM simulacoes s WHERE s.lead_id = l.id) as total_simulacoes
        FROM leads l
        WHERE 1=1 ${dateFilter} ${corretorFilter}
        ORDER BY l.created_at DESC
      `;
      break;

    case 'agendamentos':
      query = `
        SELECT 
          a.id, a.cliente_nome, a.cliente_telefone, a.imovel_nome,
          a.data_visita, a.status, a.confirmado, a.created_at
        FROM agendamentos a
        WHERE 1=1 ${dateFilter.replace('created_at', 'a.created_at')}
          ${corretor_id ? 'AND a.corretor_id = $1' : ''}
        ORDER BY a.data_visita DESC
      `;
      break;

    case 'simulacoes':
      query = `
        SELECT 
          s.id, s.imovel_nome, s.valor_imovel, s.entrada, s.taxa_juros,
          s.prazo_meses, s.parcela_mensal, s.enviada_whatsapp,
          s.cliente_interessado, s.created_at
        FROM simulacoes s
        WHERE 1=1 ${dateFilter.replace('created_at', 's.created_at')}
          ${corretor_id ? 'AND s.corretor_id = $1' : ''}
        ORDER BY s.created_at DESC
      `;
      break;
  }

  const { rows } = await dbQuery(query, params);
  return rows;
}
