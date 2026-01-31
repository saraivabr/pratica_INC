/**
 * Test API Route - Simple agent import test
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'gerente')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.log('Attempting to import and test sync...');

    const { syncLeadsDomain } = await import('@/lib/sync/agents');

    console.log('Successfully imported syncLeadsDomain, calling it now...');

    const result = await syncLeadsDomain(false);

    console.log('Sync completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Sync test completed',
      result,
    });
  } catch (error) {
    console.error('Import error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
