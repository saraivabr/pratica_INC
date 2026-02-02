/**
 * API: Enviar Mídia WhatsApp (imagens, documentos, áudios)
 *
 * POST /api/whatsapp/send-media
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendMediaMessage, formatPhoneNumber } from '@/lib/evolution-api';
import { tenantQuery, findUserWorkspace } from '@/lib/tenant-context';
import { getAuthenticatedUser } from '@/lib/api-auth';
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

// Tipos de mídia suportados
const MEDIA_TYPES = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  video: ['mp4', 'avi', 'mov', 'webm'],
  audio: ['mp3', 'ogg', 'wav', 'opus', 'm4a'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'],
} as const;

type MediaType = keyof typeof MEDIA_TYPES;

/**
 * Detectar tipo de mídia baseado na extensão do arquivo
 */
function detectMediaType(fileName: string): MediaType {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  for (const [type, extensions] of Object.entries(MEDIA_TYPES)) {
    if ((extensions as readonly string[]).includes(ext)) {
      return type as MediaType;
    }
  }

  return 'document'; // Default para documento
}

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

    const tenant = await findUserWorkspace(user);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Empresa não configurada' }, { status: 400 });
    }

    const workspaceId = tenant.id;

    const body = await request.json();
    const { instanceName, phoneNumber, mediaUrl, fileName, caption, mediaType: explicitType } = body;

    // Validações
    if (!instanceName || !phoneNumber || !mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'instanceName, phoneNumber e mediaUrl são obrigatórios' },
        { status: 400 }
      );
    }

    // Detectar ou usar tipo de mídia explícito
    const mediaType = explicitType || detectMediaType(fileName || mediaUrl);

    // Formatar número de telefone
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Enviar mídia via Evolution API
    const result = await sendMediaMessage(instanceName, {
      number: formattedPhone,
      media: {
        mediaUrl,
        fileName: fileName || `file.${mediaType === 'image' ? 'jpg' : 'pdf'}`,
        caption: caption || undefined,
      },
    });

    // Salvar mensagem no banco
    const query = tenantQuery(workspaceId);

    await query.insert('whatsapp_messages', {
      instance_name: instanceName,
      phone_number: phoneNumber,
      message_id: result.key?.id || `media-${Date.now()}`,
      message_type: `${mediaType}Message`,
      message_text: caption || `[${mediaType.toUpperCase()}]`,
      media_url: mediaUrl,
      caption: caption || null,
      is_from_me: true,
      status: 'sent',
      timestamp: new Date().toISOString(),
      raw_data: result,
    });

    return NextResponse.json({
      success: true,
      data: {
        message_id: result.key?.id,
        phone_number: phoneNumber,
        media_type: mediaType,
        media_url: mediaUrl,
        caption,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error sending media:', error);

    // Mensagem de erro amigável
    let userMessage = 'Erro ao enviar mídia';
    if (error.message?.includes('not found')) {
      userMessage = 'Instância WhatsApp não encontrada. Verifique a conexão.';
    } else if (error.message?.includes('not connected')) {
      userMessage = 'WhatsApp desconectado. Reconecte para enviar mídias.';
    } else if (error.message?.includes('timeout')) {
      userMessage = 'Tempo esgotado ao enviar mídia. Tente novamente.';
    }

    return NextResponse.json(
      { success: false, error: userMessage, details: error.message },
      { status: 500 }
    );
  }
}
