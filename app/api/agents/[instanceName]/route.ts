import { NextRequest, NextResponse } from 'next/server';
import {
  getAgentConfig,
  upsertAgentConfig,
  deleteAgentConfig,
} from '@/lib/agents/config';
import type { AgentConfigInput } from '@/lib/agents/types';
import { requireWorkspaceContext } from '@/lib/api-helpers';

interface RouteParams {
  params: Promise<{ instanceName: string }>;
}

/**
 * GET /api/agents/[instanceName]
 * Obtém configuração específica de um agente
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { instanceName } = await params;
    const workspaceId = ctx.workspaceId;

    const config = await getAgentConfig(workspaceId, instanceName);

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Configuração de agente não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[API] Error fetching agent config:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configuração do agente' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[instanceName]
 * Atualiza configuração de um agente
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { instanceName } = await params;
    const workspaceId = ctx.workspaceId;

    const body = await request.json();
    const { userId, ...input } = body as AgentConfigInput & { userId?: string };

    // Garante que o instanceName do path é usado
    const configInput: AgentConfigInput = {
      ...input,
      instanceName,
    };

    const config = await upsertAgentConfig(workspaceId, configInput, userId);

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      data: config,
    });
  } catch (error) {
    console.error('[API] Error updating agent config:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar configuração do agente' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/[instanceName]
 * Deleta configuração de um agente
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { instanceName } = await params;
    const workspaceId = ctx.workspaceId;

    const deleted = await deleteAgentConfig(workspaceId, instanceName);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Agente não encontrado ou já deletado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Agente deletado com sucesso',
    });
  } catch (error) {
    console.error('[API] Error deleting agent config:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao deletar configuração do agente' },
      { status: 500 }
    );
  }
}
