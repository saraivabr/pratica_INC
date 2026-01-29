import { NextResponse } from 'next/server';
import { getAgentConfigs, upsertAgentConfig } from '@/lib/agents/config';
import { AgentConfigRequestSchema } from '@/lib/agents/schemas';

/**
 * GET /api/agents
 * Lista todas as configurações de agentes do tenant
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = parseInt(searchParams.get('workspaceId') || '1', 10);

    const configs = await getAgentConfigs(workspaceId);

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('[API] Error fetching agents:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configurações de agentes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents
 * Cria ou atualiza configuração de agente
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validar dados com Zod
    const parseResult = AgentConfigRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { workspaceId = 1, userId, ...input } = parseResult.data;

    const config = await upsertAgentConfig(workspaceId, input, userId);

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração salva com sucesso',
      data: config,
    });
  } catch (error) {
    console.error('[API] Error saving agent:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configuração de agente' },
      { status: 500 }
    );
  }
}
