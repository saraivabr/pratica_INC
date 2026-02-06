import { NextRequest, NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant-context';
import { requireWorkspaceContext } from '@/lib/api-helpers';

/**
 * GET /api/sofia/config
 * Busca configuração do agente Sofia para o tenant
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const workspaceId = ctx.workspaceId;

    return await withTenant(workspaceId, async (client) => {
      // Buscar configuração do workspace
      const { rows: workspaces } = await client.query(
        `SELECT id, name, settings, evolution_instance_name, evolution_connected FROM workspaces WHERE id = $1`,
        [workspaceId]
      );

      if (workspaces.length === 0) {
        return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
      }

      const workspace = workspaces[0];
      const settings = workspace.settings || {};
      const sofiaConfig = settings.sofia || {
        enabled: false,
        personality: 'amigavel',
        autoReply: true,
        greetingMessage: 'Olá! Sou a Sofia, assistente virtual da Pratica Incorporadora. Como posso ajudá-lo hoje?',
        businessHoursOnly: false,
        businessHours: { start: '08:00', end: '18:00' },
        escalateKeywords: ['gerente', 'reclamação', 'problema grave'],
        traits: {
          abertura: 80,
          conscienciosidade: 90,
          extroversao: 70,
          amabilidade: 90,
          neuroticismo: 20,
        },
      };

      return NextResponse.json({
        success: true,
        config: sofiaConfig,
        instanceName: workspace.evolution_instance_name || null,
        connected: workspace.evolution_connected || false,
      });
    });
  } catch (error) {
    console.error('Error fetching sofia config:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * POST /api/sofia/config
 * Atualiza configuração do agente Sofia
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const { config } = body;
    const workspaceId = ctx.workspaceId;

    if (!config) {
      return NextResponse.json({ error: 'Configuração é obrigatória' }, { status: 400 });
    }

    return await withTenant(workspaceId, async (client) => {
      // Buscar configuração atual
      const { rows: workspaces } = await client.query(
        `SELECT id, settings FROM workspaces WHERE id = $1`,
        [workspaceId]
      );

      if (workspaces.length === 0) {
        return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
      }

      const currentSettings = workspaces[0].settings || {};
      const newSettings = {
        ...currentSettings,
        sofia: {
          ...currentSettings.sofia,
          ...config,
          updatedAt: new Date().toISOString(),
        },
      };

      // Atualizar settings do workspace
      await client.query(
        `UPDATE workspaces SET settings = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(newSettings), workspaceId]
      );

      return NextResponse.json({
        success: true,
        message: 'Configuração atualizada com sucesso',
        config: newSettings.sofia,
      });
    });
  } catch (error) {
    console.error('Error updating sofia config:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
