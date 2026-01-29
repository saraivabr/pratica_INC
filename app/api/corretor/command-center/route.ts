import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

/**
 * API consolidada do Command Center
 * Retorna tudo que o corretor precisa numa única chamada
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const corretorId = searchParams.get('corretorId');

    if (!corretorId) {
      return NextResponse.json(
        { error: 'corretorId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar leads ativos (últimos 30 dias, sem ganho/perda)
    const { rows: leads } = await dbQuery(
      `SELECT 
        l.id,
        l.nome,
        l.telefone,
        l.email,
        l.status,
        l.origem,
        l.valor_estimado,
        l.proximo_contato,
        l.observacoes,
        l.created_at,
        l.updated_at,
        e.nome as empreendimento_nome,
        e.id as empreendimento_id,
        (
          SELECT COUNT(*)
          FROM whatsapp_messages m
          WHERE m.phone_number = l.telefone
          AND m.timestamp > NOW() - INTERVAL '7 days'
        ) as mensagens_recentes
      FROM cvcrm_leads l
      LEFT JOIN cvcrm_empreendimentos e ON l.empreendimento_interesse_id = e.id
      WHERE l.corretor_id = $1
      AND l.status NOT IN ('ganho', 'perdido')
      AND l.created_at > NOW() - INTERVAL '30 days'
      ORDER BY 
        CASE 
          WHEN l.proximo_contato IS NOT NULL AND l.proximo_contato <= NOW() + INTERVAL '2 hours' THEN 1
          WHEN l.status = 'negociacao' THEN 2
          WHEN l.status = 'qualificado' THEN 3
          ELSE 4
        END,
        l.updated_at DESC
      LIMIT 50`,
      [corretorId]
    );

    // Buscar conversas recentes (últimas 24h)
    const { rows: conversas } = await dbQuery(
      `SELECT DISTINCT ON (m.phone_number)
        m.phone_number as telefone,
        m.contact_name as nome,
        m.message_text as ultima_mensagem,
        m.timestamp as ultima_interacao,
        m.is_from_me,
        l.id as lead_id,
        l.nome as lead_nome,
        l.status as lead_status
      FROM whatsapp_messages m
      LEFT JOIN cvcrm_leads l ON l.telefone = m.phone_number AND l.corretor_id = $1
      WHERE m.timestamp > NOW() - INTERVAL '24 hours'
      AND m.phone_number ~ '^[0-9]{10,13}$'
      ORDER BY m.phone_number, m.timestamp DESC
      LIMIT 20`,
      [corretorId]
    );

    // Buscar próximas ações (próximo_contato <= +48h)
    const { rows: acoes } = await dbQuery(
      `SELECT 
        l.id,
        l.nome,
        l.telefone,
        l.proximo_contato,
        l.observacoes,
        e.nome as empreendimento_nome
      FROM cvcrm_leads l
      LEFT JOIN cvcrm_empreendimentos e ON l.empreendimento_interesse_id = e.id
      WHERE l.corretor_id = $1
      AND l.proximo_contato IS NOT NULL
      AND l.proximo_contato <= NOW() + INTERVAL '48 hours'
      AND l.status NOT IN ('ganho', 'perdido')
      ORDER BY l.proximo_contato ASC
      LIMIT 10`,
      [corretorId]
    );

    // Buscar estatísticas rápidas
    const { rows: statsRows } = await dbQuery(
      `SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('ganho', 'perdido')) as leads_ativos,
        COUNT(*) FILTER (WHERE status = 'negociacao') as em_negociacao,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as novos_semana,
        COUNT(*) FILTER (WHERE status = 'ganho' AND updated_at > NOW() - INTERVAL '30 days') as vendas_mes
      FROM cvcrm_leads
      WHERE corretor_id = $1`,
      [corretorId]
    );

    const stats = statsRows[0] || {
      leads_ativos: 0,
      em_negociacao: 0,
      novos_semana: 0,
      vendas_mes: 0,
    };

    return NextResponse.json({
      leads: leads.map((l) => ({
        id: l.id,
        nome: l.nome,
        telefone: l.telefone,
        email: l.email,
        status: l.status,
        origem: l.origem,
        valorEstimado: l.valor_estimado,
        proximoContato: l.proximo_contato,
        observacoes: l.observacoes,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
        empreendimento: l.empreendimento_nome
          ? {
              id: l.empreendimento_id,
              nome: l.empreendimento_nome,
            }
          : null,
        mensagensRecentes: parseInt(l.mensagens_recentes || '0'),
      })),
      conversas: conversas.map((c) => ({
        telefone: c.telefone,
        nome: c.nome || c.lead_nome,
        ultimaMensagem: c.ultima_mensagem,
        ultimaInteracao: c.ultima_interacao,
        isFromMe: c.is_from_me,
        leadId: c.lead_id,
        leadStatus: c.lead_status,
      })),
      acoes: acoes.map((a) => ({
        leadId: a.id,
        nome: a.nome,
        telefone: a.telefone,
        proximoContato: a.proximo_contato,
        observacoes: a.observacoes,
        empreendimento: a.empreendimento_nome,
      })),
      stats: {
        leadsAtivos: parseInt(stats.leads_ativos),
        emNegociacao: parseInt(stats.em_negociacao),
        novosSemana: parseInt(stats.novos_semana),
        vendasMes: parseInt(stats.vendas_mes),
      },
    });
  } catch (error) {
    console.error('[Command Center API] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados' },
      { status: 500 }
    );
  }
}
