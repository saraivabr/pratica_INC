/**
 * API: Gerenciar Instâncias WhatsApp por Tenant
 *
 * GET /api/tenants/:id/whatsapp - Listar instâncias do tenant
 * POST /api/tenants/:id/whatsapp - Criar nova instância
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkspace, updateWorkspace } from '@/lib/tenant-context';
import {
  createInstance,
  fetchInstances,
  getQRCode,
  getConnectionStatus,
  setWebhook,
} from '@/lib/evolution-api';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    if (ctx.user.role !== 'admin' && ctx.user.role !== 'gerente') {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const params = await context.params;
    const workspaceId = parseInt(params.id);

    if (isNaN(workspaceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    const tenant = await getWorkspace(workspaceId);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Retornar instância do tenant (single instance model)
    const instanceName = (tenant as any).evolution_instance_name || null;
    const connected = (tenant as any).evolution_connected || false;

    if (!instanceName) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // Buscar status atual da instância
    let connectionState = connected ? 'open' : 'disconnected';
    try {
      const status = await getConnectionStatus(instanceName);
      connectionState = status.state || connectionState;
    } catch {
      connectionState = 'unknown';
    }

    return NextResponse.json({
      success: true,
      data: [{
        instance_name: instanceName,
        connection_state: connectionState,
        status: connected ? 'connected' : 'disconnected',
      }],
      total: 1,
    });
  } catch (error: any) {
    console.error('Error listing WhatsApp instances:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    if (ctx.user.role !== 'admin' && ctx.user.role !== 'gerente') {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const params = await context.params;
    const workspaceId = parseInt(params.id);

    if (isNaN(workspaceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    const tenant = await getWorkspace(workspaceId);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Gerar nome único da instância
    const instanceName = body.instanceName || `${tenant.slug}-${Date.now()}`;

    // Determinar URL base para webhooks dinamicamente
    // 1. Usa WEBHOOK_BASE_URL se configurado (mais confiável)
    // 2. Usa NEXT_PUBLIC_APP_URL se configurado
    // 3. Detecta dinamicamente do request (host + protocolo)
    // 4. Fallback para localhost apenas em desenvolvimento local real
    let baseUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
      const proto = request.headers.get('x-forwarded-proto') ||
                    (host?.includes('localhost') ? 'http' : 'https');

      if (host && !host.includes('localhost')) {
        baseUrl = `${proto}://${host}`;
      } else {
        baseUrl = 'http://localhost:3000';
      }
    }

    // Configurar webhook
    const webhookUrl = `${baseUrl}/api/webhook/evolution/${workspaceId}`;
    console.log(`[WhatsApp] Webhook URL configurado: ${webhookUrl}`);

    // Criar instância na Evolution API com webhook
    // Se body.number fornecido, habilita pairing code
    console.log(`[WhatsApp] Criando instância ${instanceName} com telefone: ${body.number || 'não informado'}`);

    const evolutionInstance = await createInstance({
      instanceName,
      number: body.number, // Telefone para pairing code (opcional)
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      reject_call: body.reject_call ?? false,
      msg_call: body.msg_call,
      groups_ignore: body.groups_ignore ?? true,
      always_online: body.always_online ?? false,
      read_messages: body.read_messages ?? false,
      webhook: {
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      },
    });

    // Obter QR Code
    let qrCodeData;
    try {
      qrCodeData = await getQRCode(instanceName);
    } catch (error) {
      console.log('QR Code will be generated when connecting');
    }

    // Salvar instância no workspace
    await updateWorkspace(workspaceId, {
      evolution_instance_name: instanceName,
      evolution_connected: false,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          instance_name: instanceName,
          qr_code: qrCodeData?.base64,
          pairing_code: qrCodeData?.pairingCode,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating WhatsApp instance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
