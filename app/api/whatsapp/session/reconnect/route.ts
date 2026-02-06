/**
 * WhatsApp Session Reconnect API
 *
 * POST /api/whatsapp/session/reconnect
 *
 * Calls Evolution API to generate a new QR Code for instance reconnection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQRCode } from '@/lib/evolution-api';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const { instanceName } = body;

    if (!instanceName) {
      return NextResponse.json(
        { success: false, error: 'instanceName is required' },
        { status: 400 }
      );
    }

    // Validate instance ownership
    const userInstance = (ctx.user as any)?.evolution_instance_name;
    if (!userInstance || userInstance !== instanceName) {
      return NextResponse.json(
        { success: false, error: 'Instância não pertence a este usuário' },
        { status: 403 }
      );
    }

    console.log(`[Reconnect] Requesting QR Code for instance: ${instanceName}`);

    // Call Evolution API to get QR Code
    const qrData = await getQRCode(instanceName);

    if (!qrData?.base64) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate QR Code' },
        { status: 500 }
      );
    }

    console.log(`[Reconnect] QR Code generated for instance: ${instanceName}`);

    return NextResponse.json({
      success: true,
      qrCode: qrData.base64,
      pairingCode: qrData.pairingCode || null,
    });
  } catch (error: any) {
    console.error('[Reconnect] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reconnect instance'
      },
      { status: 500 }
    );
  }
}
