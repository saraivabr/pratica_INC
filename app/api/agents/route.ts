import { NextRequest, NextResponse } from 'next/server';
import { getAgentConfigs, upsertAgentConfig } from '@/lib/agents/config';
import { AgentConfigRequestSchema } from '@/lib/agents/schemas';
import { requireWorkspaceContext } from '@/lib/api-helpers';

/**
 * GET /api/agents
 * Lista todas as configurações de agentes do tenant
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const workspaceId = ctx.workspaceId;

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
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();

    // Validar dados com Zod
    const parseResult = AgentConfigRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { userId, ...input } = parseResult.data;

    const config = await upsertAgentConfig(ctx.workspaceId, input, userId);

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
