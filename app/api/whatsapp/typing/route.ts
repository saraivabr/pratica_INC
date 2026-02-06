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
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await rateLimiter.check(`whatsapp:${clientIp}`, RateLimitConfigs.WHATSAPP_SEND);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    const validation = await validateRequest(request, WhatsAppTypingSchema);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error, details: validation.details }, { status: 400 });
    }
    const { instanceName, phoneNumber, action, duration } = validation.data;

    // Validate instance ownership — user can only send typing to their own instance
    const userInstance = user.evolution_instance_name;
    if (!userInstance || userInstance !== instanceName) {
      return NextResponse.json(
        { success: false, error: 'Instância não pertence a este usuário' },
        { status: 403 }
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
