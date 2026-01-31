import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

/**
 * Get simulation statistics for dashboard
 * 
 * Returns metrics about simulations performed:
 * - Total simulations
 * - SBPE vs MCMV breakdown
 * - Average CET
 * - Conversion funnel metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query simulation tracking data
    // Note: This assumes we're tracking simulations in tracking_events table
    const simulationQuery = `
      SELECT 
        event_type,
        data->>'tipoFinanciamento' as tipo_financiamento,
        data->>'cetAnual' as cet_anual,
        data->>'parcelaTotal' as parcela_total,
        data->>'valorFinanciado' as valor_financiado,
        created_at
      FROM tracking_events
      WHERE event_type IN ('simulation', 'simulation_caixa')
        AND created_at >= $1
      ORDER BY created_at DESC
    `;

    const { rows: simulations } = await dbQuery(simulationQuery, [startDate.toISOString()]);

    // Calculate metrics
    const totalSimulations = simulations.length;
    
    const sbpeCount = simulations.filter(s => 
      s.tipo_financiamento === 'SBPE' || !s.tipo_financiamento
    ).length;
    
    const mcmvCount = simulations.filter(s => 
      s.tipo_financiamento === 'MCMV'
    ).length;

    // Average CET
    const cetsValues = simulations
      .map(s => parseFloat(s.cet_anual))
      .filter(v => !isNaN(v));
    
    const avgCET = cetsValues.length > 0
      ? cetsValues.reduce((a, b) => a + b, 0) / cetsValues.length
      : 0;

    // CET ranges for histogram
    const cetRanges = {
      '0-10%': cetsValues.filter(v => v < 10).length,
      '10-12%': cetsValues.filter(v => v >= 10 && v < 12).length,
      '12-14%': cetsValues.filter(v => v >= 12 && v < 14).length,
      '14%+': cetsValues.filter(v => v >= 14).length,
    };

    // Average loan amount
    const loanValues = simulations
      .map(s => parseFloat(s.valor_financiado))
      .filter(v => !isNaN(v));
    
    const avgLoanAmount = loanValues.length > 0
      ? loanValues.reduce((a, b) => a + b, 0) / loanValues.length
      : 0;

    // Simulations per day (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const simulationsPerDay = last7Days.map(day => {
      const count = simulations.filter(s => 
        s.created_at.toISOString().split('T')[0] === day
      ).length;
      return { date: day, count };
    });

    // Time to simulation (if we have interaction data)
    const interactionQuery = `
      SELECT 
        user_id,
        MIN(created_at) as first_interaction,
        MAX(CASE WHEN event_type IN ('simulation', 'simulation_caixa') THEN created_at END) as first_simulation
      FROM tracking_events
      WHERE created_at >= $1
      GROUP BY user_id
      HAVING MAX(CASE WHEN event_type IN ('simulation', 'simulation_caixa') THEN created_at END) IS NOT NULL
    `;

    const { rows: interactions } = await dbQuery(interactionQuery, [startDate.toISOString()]);

    const timesToSimulation = interactions
      .map(i => {
        if (!i.first_simulation || !i.first_interaction) return null;
        const diff = new Date(i.first_simulation).getTime() - new Date(i.first_interaction).getTime();
        return Math.floor(diff / 1000 / 60); // minutes
      })
      .filter((v): v is number => v !== null && v >= 0);

    const avgTimeToSimulation = timesToSimulation.length > 0
      ? timesToSimulation.reduce((a, b) => a + b, 0) / timesToSimulation.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalSimulations,
        sbpeCount,
        mcmvCount,
        sbpePercentage: totalSimulations > 0 ? (sbpeCount / totalSimulations * 100).toFixed(1) : 0,
        mcmvPercentage: totalSimulations > 0 ? (mcmvCount / totalSimulations * 100).toFixed(1) : 0,
        avgCET: avgCET.toFixed(2),
        cetRanges,
        avgLoanAmount: Math.round(avgLoanAmount),
        simulationsPerDay,
        avgTimeToSimulation: Math.round(avgTimeToSimulation),
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching simulation stats:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro ao buscar estatísticas',
        // Return empty data structure so frontend doesn't break
        data: {
          totalSimulations: 0,
          sbpeCount: 0,
          mcmvCount: 0,
          sbpePercentage: 0,
          mcmvPercentage: 0,
          avgCET: '0',
          cetRanges: { '0-10%': 0, '10-12%': 0, '12-14%': 0, '14%+': 0 },
          avgLoanAmount: 0,
          simulationsPerDay: [],
          avgTimeToSimulation: 0,
        }
      },
      { status: 500 }
    );
  }
}
