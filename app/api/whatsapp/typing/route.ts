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
import { validateRequest, WhatsAppTypingSchema } from '@/lib/validation-schemas';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    // Nota: Esta API não requer tenant pois apenas envia comando para Evolution API

    const validation = await validateRequest(request, WhatsAppTypingSchema);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error, details: validation.details }, { status: 400 });
    }
    const { instanceName, phoneNumber, action, duration } = validation.data;

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
