/**
 * Cron Endpoint for Salva-Leads Daily Execution
 *
 * This endpoint is called automatically by Vercel Cron at 8am daily
 * to process abandoned leads and send recovery messages via WhatsApp.
 *
 * Security: Protected by CRON_SECRET environment variable.
 * Schedule: 0 8 * * * (8am UTC daily)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  runLeadRecoveryForTenant,
  getActiveTenantsWithEvolution,
} from '@/lib/salva-leads/processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

// Conservative timeout for reliability
const MAX_EXECUTION_TIME_MS = 25000; // 25 seconds max

interface TenantResult {
  workspaceId: number;
  tenantName: string;
  totalProcessed: number;
  totalSent: number;
  corretoresCount: number;
  error?: string;
}

interface CronResponse {
  success: boolean;
  timestamp: string;
  duration: number;
  summary: {
    tenantsProcessed: number;
    totalLeadsProcessed: number;
    totalMessagesSent: number;
    errors: number;
  };
  results: TenantResult[];
  error?: string;
}

/**
 * Validates the cron request authentication
 */
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Allow in development mode for testing
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Vercel Cron sends the secret in the Authorization header
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Also check for x-cron-secret header (alternative method)
  const xCronSecret = request.headers.get('x-cron-secret');
  if (xCronSecret === cronSecret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[Salva-Leads Cron] Starting daily execution at ${timestamp}`);

  // Validate authentication
  if (!validateCronAuth(request)) {
    console.error('[Salva-Leads Cron] Unauthorized request - invalid or missing CRON_SECRET');
    return NextResponse.json(
      {
        success: false,
        timestamp,
        duration: Date.now() - startTime,
        summary: {
          tenantsProcessed: 0,
          totalLeadsProcessed: 0,
          totalMessagesSent: 0,
          errors: 1,
        },
        results: [],
        error: 'Unauthorized - Invalid or missing CRON_SECRET',
      },
      { status: 401 }
    );
  }

  const results: TenantResult[] = [];
  let totalErrors = 0;

  try {
    // Get all active tenants with Evolution API configured
    const tenants = await getActiveTenantsWithEvolution();
    console.log(`[Salva-Leads Cron] Found ${tenants.length} active tenants with Evolution API`);

    if (tenants.length === 0) {
      console.log('[Salva-Leads Cron] No active tenants found - nothing to process');
      return NextResponse.json({
        success: true,
        timestamp,
        duration: Date.now() - startTime,
        summary: {
          tenantsProcessed: 0,
          totalLeadsProcessed: 0,
          totalMessagesSent: 0,
          errors: 0,
        },
        results: [],
      });
    }

    // Process each tenant (with timeout guard)
    for (const tenant of tenants) {
      // Check if we're approaching timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_EXECUTION_TIME_MS) {
        console.log(`[Salva-Leads Cron] Approaching timeout (${elapsed}ms), stopping early`);
        break;
      }

      try {
        console.log(`[Salva-Leads Cron] Processing tenant ${tenant.id} (${tenant.name})`);

        // Reduced to 2 leads per corretor to avoid timeout
        const result = await runLeadRecoveryForTenant(tenant.id, {
          dryRun: false,
          maxLeadsPerCorretor: 2,
          startTime,
        });

        results.push({
          workspaceId: tenant.id,
          tenantName: tenant.name,
          totalProcessed: result.totalProcessed,
          totalSent: result.totalSent,
          corretoresCount: result.corretoresResults.length,
        });

        console.log(
          `[Salva-Leads Cron] Tenant ${tenant.id} completed: ` +
            `${result.totalProcessed} processed, ${result.totalSent} sent`
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Salva-Leads Cron] Error processing tenant ${tenant.id}:`, error);

        results.push({
          workspaceId: tenant.id,
          tenantName: tenant.name,
          totalProcessed: 0,
          totalSent: 0,
          corretoresCount: 0,
          error: errorMessage,
        });

        totalErrors++;
      }
    }

    // Calculate totals
    const totalLeadsProcessed = results.reduce((sum, r) => sum + r.totalProcessed, 0);
    const totalMessagesSent = results.reduce((sum, r) => sum + r.totalSent, 0);
    const duration = Date.now() - startTime;

    console.log(
      `[Salva-Leads Cron] Daily execution completed in ${duration}ms - ` +
        `${tenants.length} tenants, ${totalLeadsProcessed} leads processed, ` +
        `${totalMessagesSent} messages sent, ${totalErrors} errors`
    );

    return NextResponse.json({
      success: totalErrors === 0,
      timestamp,
      duration,
      summary: {
        tenantsProcessed: tenants.length,
        totalLeadsProcessed,
        totalMessagesSent,
        errors: totalErrors,
      },
      results,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;

    console.error('[Salva-Leads Cron] Fatal error during daily execution:', error);

    return NextResponse.json(
      {
        success: false,
        timestamp,
        duration,
        summary: {
          tenantsProcessed: 0,
          totalLeadsProcessed: 0,
          totalMessagesSent: 0,
          errors: 1,
        },
        results,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Support POST for manual testing
export async function POST(request: NextRequest): Promise<NextResponse<CronResponse>> {
  return GET(request);
}
