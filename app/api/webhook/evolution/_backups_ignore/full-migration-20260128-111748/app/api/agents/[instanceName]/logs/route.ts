import { NextResponse } from 'next/server';
import { getConversationLogs } from '@/lib/agents/config';

interface RouteParams {
  params: Promise<{ instanceName: string }>;
}

/**
 * GET /api/agents/[instanceName]/logs
 * Lista logs de conversa com paginação
 *
 * Query params:
 * - tenantId: ID do tenant (default: 1)
 * - page: Número da página (default: 1)
 * - limit: Itens por página (default: 20, max: 100)
 * - phoneNumber: Filtrar por número de telefone
 * - startDate: Data inicial (ISO string)
 * - endDate: Data final (ISO string)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { instanceName } = await params;
    const { searchParams } = new URL(request.url);

    const tenantId = parseInt(searchParams.get('tenantId') || '1', 10);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const phoneNumber = searchParams.get('phoneNumber') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const result = await getConversationLogs(tenantId, instanceName, {
      page,
      limit,
      phoneNumber,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching conversation logs:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar logs de conversa' },
      { status: 500 }
    );
  }
}
