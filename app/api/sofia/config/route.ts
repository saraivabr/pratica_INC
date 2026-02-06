import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
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

    // Buscar configuração do tenant
    const { rows: tenants } = await dbQuery(
      `SELECT id, name, settings, evolution_instances FROM tenants WHERE id = $1`,
      [workspaceId]
    );

    if (tenants.length === 0) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    const tenant = tenants[0];
    const settings = tenant.settings || {};
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
      instances: tenant.evolution_instances || [],
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

    // Buscar configuração atual
    const { rows: tenants } = await dbQuery(
      `SELECT id, settings FROM tenants WHERE id = $1`,
      [workspaceId]
    );

    if (tenants.length === 0) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    const currentSettings = tenants[0].settings || {};
    const newSettings = {
      ...currentSettings,
      sofia: {
        ...currentSettings.sofia,
        ...config,
        updatedAt: new Date().toISOString(),
      },
    };

    // Atualizar settings do tenant
    await dbQuery(
      `UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(newSettings), workspaceId]
    );

    return NextResponse.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      config: newSettings.sofia,
    });
  } catch (error) {
    console.error('Error updating sofia config:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
