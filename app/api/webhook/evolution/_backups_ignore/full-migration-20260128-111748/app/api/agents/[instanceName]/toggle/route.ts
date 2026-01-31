import { NextResponse } from 'next/server';
import { toggleAgentActive, getAgentConfig } from '@/lib/agents/config';

interface RouteParams {
  params: Promise<{ instanceName: string }>;
}

/**
 * PATCH /api/agents/[instanceName]/toggle
 * Alterna o estado ativo/inativo de um agente
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { instanceName } = await params;
    const { searchParams } = new URL(request.url);
    const tenantId = parseInt(searchParams.get('tenantId') || '1', 10);

    // Verifica se agente existe
    const existingConfig = await getAgentConfig(tenantId, instanceName);

    if (!existingConfig) {
      return NextResponse.json(
        { success: false, error: 'Agente não encontrado' },
        { status: 404 }
      );
    }

    // Toggle: inverte o estado atual
    const newActiveState = !existingConfig.isActive;
    const updated = await toggleAgentActive(tenantId, instanceName, newActiveState);

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
