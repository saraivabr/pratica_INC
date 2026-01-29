import { NextRequest, NextResponse } from 'next/server';
import {
  runLeadRecoveryForCorretor,
  getActiveTenantsWithEvolution,
  getCorretoresComWhatsAppAtivo
} from '@/lib/salva-leads/processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos

export async function GET(request: NextRequest) {
  // Verificar autenticação do Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Permitir execução manual em dev ou com secret correto
  const isAuthorized =
    process.env.NODE_ENV === 'development' ||
    authHeader === `Bearer ${cronSecret}`;

  if (!isAuthorized) {
    console.error('[Salva-Leads Cron] Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[Salva-Leads Cron] Iniciando execução agendada');

  const startTime = Date.now();
  const results: Array<{
    tenantId: number;
    corretorId: string;
    processed: number;
    sent: number;
    error?: string;
  }> = [];

  try {
    // Buscar todos os tenants ativos com Evolution configurado
    const tenants = await getActiveTenantsWithEvolution();
    console.log(`[Salva-Leads Cron] Encontrados ${tenants.length} tenants ativos`);

    for (const tenant of tenants) {
      try {
        // Buscar corretores com WhatsApp ativo
        const corretores = await getCorretoresComWhatsAppAtivo(tenant.id);
        console.log(`[Salva-Leads Cron] Tenant ${tenant.id}: ${corretores.length} corretores`);

        for (const corretor of corretores) {
          try {
            const result = await runLeadRecoveryForCorretor(
              tenant.id,
              corretor.id,
              { maxLeads: 5 } // Limitar por corretor
            );

            results.push({
              tenantId: tenant.id,
              corretorId: corretor.id,
              processed: result.processed,
              sent: result.sent
            });

          } catch (error: any) {
            console.error(`[Salva-Leads Cron] Erro corretor ${corretor.id}:`, error);
            results.push({
              tenantId: tenant.id,
              corretorId: corretor.id,
              processed: 0,
              sent: 0,
              error: error.message
            });
          }
        }

      } catch (error: any) {
        console.error(`[Salva-Leads Cron] Erro tenant ${tenant.id}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);

    console.log(`[Salva-Leads Cron] Concluído em ${duration}ms - ${totalProcessed} processados, ${totalSent} enviados`);

    return NextResponse.json({
      success: true,
      duration,
      summary: {
        tenants: results.length,
        processed: totalProcessed,
        sent: totalSent
      },
      results
    });

  } catch (error: any) {
    console.error('[Salva-Leads Cron] Erro geral:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// Também permitir POST para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}
