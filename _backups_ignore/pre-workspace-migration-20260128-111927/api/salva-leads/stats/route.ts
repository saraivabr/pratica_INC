import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = parseInt(searchParams.get('tenantId') || '0');
  const period = searchParams.get('period') || '7d'; // 7d, 30d, all

  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenantId is required' },
      { status: 400 }
    );
  }

  try {
    // Calcular data de início baseado no período
    let dateFilter = '';
    if (period === '7d') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === '30d') {
      dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
    }

    // Estatísticas de conversas
    const conversationsStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'paused_by_corretor') as paused,
        COUNT(*) FILTER (WHERE classification = 'tem_potencial') as com_potencial,
        COUNT(*) FILTER (WHERE classification = 'encerrada') as encerradas
      FROM salva_leads_conversations
      WHERE tenant_id = $1 ${dateFilter}
    `, [tenantId]);

    // Estatísticas de execuções
    const runsStats = await pool.query(`
      SELECT
        COUNT(*) as total_runs,
        SUM(leads_processed) as total_processed,
        SUM(leads_sent) as total_sent,
        AVG(leads_sent) as avg_sent_per_run
      FROM salva_leads_runs
      WHERE tenant_id = $1 ${dateFilter}
    `, [tenantId]);

    // Estatísticas de tool calls
    const toolsStats = await pool.query(`
      SELECT
        tc.tool_name,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE tc.status = 'completed') as successful
      FROM salva_leads_tool_calls tc
      JOIN salva_leads_conversations c ON c.id = tc.conversation_id
      WHERE c.tenant_id = $1 ${dateFilter.replace('created_at', 'c.created_at')}
      GROUP BY tc.tool_name
      ORDER BY count DESC
    `, [tenantId]);

    // Mensagens por dia (últimos 7 dias)
    const messagesPerDay = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as conversations_created
      FROM salva_leads_conversations
      WHERE tenant_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [tenantId]);

    const convStats = conversationsStats.rows[0];
    const runStats = runsStats.rows[0];

    return NextResponse.json({
      success: true,
      period,
      conversations: {
        total: parseInt(convStats.total) || 0,
        active: parseInt(convStats.active) || 0,
        completed: parseInt(convStats.completed) || 0,
        paused: parseInt(convStats.paused) || 0,
        with_potential: parseInt(convStats.com_potencial) || 0,
        closed: parseInt(convStats.encerradas) || 0,
      },
      runs: {
        total: parseInt(runStats.total_runs) || 0,
        leads_processed: parseInt(runStats.total_processed) || 0,
        leads_sent: parseInt(runStats.total_sent) || 0,
      },
      tools: toolsStats.rows,
      messagesPerDay: messagesPerDay.rows,
      // Keep backwards compatibility
      stats: {
        conversations: convStats,
        runs: runStats,
        tools: toolsStats.rows,
        messagesPerDay: messagesPerDay.rows
      }
    });

  } catch (error: any) {
    console.error('[Salva-Leads Stats] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
