import { NextRequest, NextResponse } from 'next/server';
import { toggleAgentActive, getAgentConfig } from '@/lib/agents/config';
import { requireWorkspaceContext } from '@/lib/api-helpers';

interface RouteParams {
  params: Promise<{ instanceName: string }>;
}

/**
 * PATCH /api/agents/[instanceName]/toggle
 * Alterna o estado ativo/inativo de um agente
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { instanceName } = await params;
    const workspaceId = ctx.workspaceId;

    // Verifica se agente existe
    const existingConfig = await getAgentConfig(workspaceId, instanceName);

    if (!existingConfig) {
      return NextResponse.json(
        { success: false, error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    // Toggle: inverte o estado atual
    const newActiveState = !existingConfig.isActive;
    const updated = await toggleAgentActive(workspaceId, instanceName, newActiveState);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Erro ao alterar estado do agente' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: newActiveState ? 'Agente ativado com sucesso' : 'Agente desativado com sucesso',
      data: {
        instanceName,
        isActive: newActiveState,
      },
    });
  } catch (error) {
    console.error('[API] Error toggling agent active:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao alterar estado do agente' },
      { status: 500 }
    );
  }
}
