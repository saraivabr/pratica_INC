/**
 * API: Indicador de Digitando WhatsApp
 *
 * POST /api/whatsapp/typing
 *
 * Envia indicador "digitando..." para o contato
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTyping, sendPresence } from '@/lib/evolution-api';
import { getAuthenticatedUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    // Nota: Esta API não requer tenant pois apenas envia comando para Evolution API

    const body = await request.json();
    const { instanceName, phoneNumber, action = 'start', duration = 3000 } = body;

    if (!instanceName || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'instanceName e phoneNumber são obrigatórios' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      // Iniciar typing com auto-pause
      await sendTyping(instanceName, phoneNumber, duration);
    } else if (action === 'stop') {
      // Parar typing manualmente
      await sendPresence(instanceName, phoneNumber, 'paused');
    }

    return NextResponse.json({
      success: true,
      action,
      duration: action === 'start' ? duration : 0,
    });
  } catch (error: any) {
    console.error('Error sending typing indicator:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
