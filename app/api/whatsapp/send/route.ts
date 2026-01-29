/**
 * API: Enviar Mensagem WhatsApp
 *
 * POST /api/whatsapp/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTextMessage, formatPhoneNumber } from '@/lib/evolution-api';
import { tenantQuery, findUserWorkspace } from '@/lib/tenant-context';
import { getAuthenticatedUser } from '@/lib/api-auth';
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';
import { z } from 'zod';
import { messageTextSchema, phoneSchema } from '@/lib/validation-schemas';

// Validation schema for WhatsApp send request
const SendWhatsAppSchema = z.object({
  instanceName: z.string().min(1, 'Nome da instância é obrigatório'),
  phoneNumber: phoneSchema,
  message: messageTextSchema,
});

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const tenant = await findUserWorkspace(user);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Empresa não configurada' }, { status: 400 });
    }

    const workspaceId = tenant.id;

    // Validate request body
    const body = await request.json();
    const validationResult = SendWhatsAppSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        { 
          success: false, 
          error: firstError.message,
          field: firstError.path.join('.'),
        },
        { status: 400 }
      );
    }

    const { instanceName, phoneNumber, message } = validationResult.data;

    // Rate limiting: 20 messages per minute per user
    const rateLimitKey = `whatsapp:send:${user.id}`;
    const rateLimit = await rateLimiter.check(rateLimitKey, RateLimitConfigs.WHATSAPP_SEND);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Limite de mensagens atingido. Aguarde antes de enviar mais mensagens.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': RateLimitConfigs.WHATSAPP_SEND.maxRequests.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          },
        }
      );
    }

    // Formatar número de telefone
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Enviar mensagem via Evolution API
    const result = await sendTextMessage(instanceName, {
      number: formattedPhone,
      text: message,
    });

    // Salvar mensagem no banco
    const query = tenantQuery(workspaceId);

    await query.insert('whatsapp_messages', {
      instance_name: instanceName,
      phone_number: phoneNumber,
      message_id: result.key.id,
      message_type: 'conversation',
      message_text: message,
      is_from_me: true,
      status: 'sent',
      timestamp: new Date().toISOString(),
      raw_data: result,
    });

    return NextResponse.json({
      success: true,
      data: {
        message_id: result.key.id,
        phone_number: phoneNumber,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);

    // Don't expose internal error details to client
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isKnownError = errorMessage.includes('not connected') ||
                         errorMessage.includes('invalid number') ||
                         errorMessage.includes('blocked');

    return NextResponse.json(
      {
        success: false,
        error: isKnownError ? errorMessage : 'Erro ao enviar mensagem. Tente novamente.'
      },
      { status: 500 }
    );
  }
}
