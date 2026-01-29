/**
 * API Route: Complete CV CRM Sync
 * Executes all 28 agents across 7 domains
 *
 * Usage:
 *   curl http://localhost:3000/api/sync/all
 *   OR
 *   Open browser: http://localhost:3000/api/sync/all
 */

import { NextResponse } from 'next/server';
import { syncAllDomains } from '@/lib/sync/agents';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function GET() {
  // ❌ CV CRM SYNC ALL DESABILITADO - Erro 405 constantemente
  return NextResponse.json({
    success: false,
    message: "CV CRM sync completo desabilitado por Fellipe - erro 405 constante",
    timestamp: new Date().toISOString(),
    note: "Para reativar, descomentar código em app/api/sync/all/route.ts"
  }, { status: 503 });

  /* CÓDIGO ORIGINAL COMENTADO
  const startTime = Date.now();

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     CV CRM COMPLETE SYNC - ALL 28 AGENTS                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Confirm environment
    console.log('🔧 Environment Check:');
    console.log(`   CV CRM Email: ${process.env.CVCRM_EMAIL || 'NOT SET'}`);
    console.log(`   Base URL: ${process.env.CVCRM_BASE_URL || 'NOT SET'}`);
    console.log(`   Database: ${process.env.DATABASE_URL ? 'Connected' : 'NOT SET'}`);
    console.log('');

    if (!process.env.CVCRM_EMAIL || !process.env.DATABASE_URL) {
      console.error('❌ Missing required environment variables!');
      return NextResponse.json(
        { error: 'Missing required environment variables' },
        { status: 500 }
      );
    }

    // Execute full sync (fullSync = true)
    console.log('🚀 Starting complete sync...\n');
    const results = await syncAllDomains(true);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Display final report
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    SYNC COMPLETED!                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📈 Final Report:');
    console.log(`   Total Duration: ${duration}s`);
    console.log('');
    console.log('✅ Domain Results:');
    console.log(`   Leads Domain: ${results.leads.length} agents completed`);
    console.log(`   Pessoas Domain: ${results.pessoas.length} agents completed`);
    console.log(`   Reservas Domain: ${results.reservas.length} agents completed`);
    console.log(`   Atendimentos Domain: ${results.atendimentos.length} agents completed`);
    console.log(`   Assistências Domain: ${results.assistencias.length} agents completed`);
    console.log(`   Commercial Domain: ${results.comercial.length} agents completed`);
    console.log(`   Final Domain: ${results.final.length} agents completed`);
    console.log('');

    // Calculate totals
    const totalAgents =
      results.leads.length +
      results.pessoas.length +
      results.reservas.length +
      results.atendimentos.length +
      results.assistencias.length +
      results.comercial.length +
      results.final.length;

    console.log('🎉 SUCCESS:');
    console.log(`   ${totalAgents}/28 agents synchronized successfully`);
    console.log(`   Average time per agent: ${(parseFloat(duration) / totalAgents).toFixed(2)}s`);
    console.log('');

    // Prepare response
    const response = {
      success: true,
      message: 'Complete sync executed successfully',
      duration: parseFloat(duration),
      stats: {
        totalAgents,
        averageTimePerAgent: parseFloat((parseFloat(duration) / totalAgents).toFixed(2)),
      },
      domains: {
        leads: {
          agents: results.leads.length,
          results: results.leads,
        },
        pessoas: {
          agents: results.pessoas.length,
          results: results.pessoas,
        },
        reservas: {
          agents: results.reservas.length,
          results: results.reservas,
        },
        atendimentos: {
          agents: results.atendimentos.length,
          results: results.atendimentos,
        },
        assistencias: {
          agents: results.assistencias.length,
          results: results.assistencias,
        },
        comercial: {
          agents: results.comercial.length,
          results: results.comercial,
        },
        final: {
          agents: results.final.length,
          results: results.final,
        },
      },
      nextSteps: [
        'Review sync logs for any warnings',
        'Verify data integrity in database',
        'Check dashboard for sync status',
        'Schedule automated syncs via cron',
      ],
    };

    return NextResponse.json(response);

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.error('\n❌ SYNC FAILED:');
    console.error(error);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('   1. Check API tokens in .env.local');
    console.error('   2. Verify database connection');
    console.error('   3. Review error logs above');
    console.error('   4. Retry with individual domain sync');
    console.error('');

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: parseFloat(duration),
        troubleshooting: [
          'Check API tokens in .env.local',
          'Verify database connection',
          'Review error logs',
          'Retry with individual domain sync',
        ],
      },
      { status: 500 }
    );
  }
  */ // FIM DO CÓDIGO COMENTADO
}
