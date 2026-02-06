/**
 * API: Listar Mensagens WhatsApp
 *
 * GET /api/whatsapp/messages?instance=xxx&phone=xxx
 * PATCH /api/whatsapp/messages - Marcar mensagens como lidas
 */

import { NextRequest, NextResponse } from 'next/server';
import { tenantQuery, findUserWorkspace } from '@/lib/tenant-context';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { markAsRead as markAsReadEvolution } from '@/lib/evolution-api';
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

/**
 * Contar mensagens não lidas de uma conversa
 * Mensagens recebidas (is_from_me = false) sem status 'read'
 */
function countUnreadMessages(messages: any[], phoneNumber: string): number {
  return messages.filter(
    (msg: any) =>
      msg.phone_number === phoneNumber &&
      !msg.is_from_me &&
      msg.status !== 'read'
  ).length;
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const instanceName = searchParams.get('instance');
    const phoneNumber = searchParams.get('phone');

    if (!instanceName) {
      return NextResponse.json(
        { success: false, error: 'Nome da instância é obrigatório' },
        { status: 400 }
      );
    }

    const query = tenantQuery(workspaceId);

    // Se phone number foi especificado, buscar mensagens dessa conversa
    if (phoneNumber) {
      const messages = await query.select('whatsapp_messages', {
        instance_name: instanceName,
        phone_number: phoneNumber,
      });

      // Ordenar por timestamp
      messages.sort((a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Contar não lidas desta conversa
      const unreadCount = countUnreadMessages(messages, phoneNumber);

      return NextResponse.json({
        success: true,
        data: messages,
        total: messages.length,
        unread_count: unreadCount,
      });
    }

    // Caso contrário, listar todas as conversas (últimas mensagens por telefone)
    const allMessages = await query.select('whatsapp_messages', {
      instance_name: instanceName,
    });

    // Agrupar por telefone e pegar a última mensagem de cada
    const conversationsMap = new Map<string, any>();
    const unreadCountMap = new Map<string, number>();

    // Primeiro passo: agrupar mensagens e contar não lidas
    allMessages.forEach((msg: any) => {
      const phone = msg.phone_number;

      // Atualizar última mensagem
      const existing = conversationsMap.get(phone);
      if (!existing || new Date(msg.timestamp) > new Date(existing.timestamp)) {
        conversationsMap.set(phone, msg);
      }

      // Contar não lidas (mensagens recebidas sem status 'read')
      if (!msg.is_from_me && msg.status !== 'read') {
        unreadCountMap.set(phone, (unreadCountMap.get(phone) || 0) + 1);
      }
    });

    const conversations = Array.from(conversationsMap.values())
      .sort((a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    // Buscar informações dos contatos
    const conversationsWithContact = await Promise.all(
      conversations.map(async (msg: any) => {
        const contacts = await query.select('whatsapp_contacts', {
          phone_number: msg.phone_number,
        });

        const contact = contacts[0];

        return {
          phone_number: msg.phone_number,
          contact_name: contact?.contact_name || msg.contact_name || msg.phone_number,
          profile_picture_url: contact?.profile_picture_url || null,
          last_message: msg.message_text,
          last_message_type: msg.message_type,
          last_message_time: msg.timestamp,
          is_from_me: msg.is_from_me,
          unread_count: unreadCountMap.get(msg.phone_number) || 0,
          lead_id: contact?.lead_id || msg.lead_id,
          is_lead: !!(contact?.lead_id || msg.lead_id),
        };
      })
    );

    // Calcular total de não lidas
    const totalUnread = Array.from(unreadCountMap.values()).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      data: conversationsWithContact,
      total: conversationsWithContact.length,
      total_unread: totalUnread,
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Marcar mensagens como lidas
 */
export async function PATCH(request: NextRequest) {
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
    const { instanceName, phoneNumber, messageIds } = body;

    if (!instanceName || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'instanceName e phoneNumber são obrigatórios' },
        { status: 400 }
      );
    }

    const query = tenantQuery(workspaceId);

    // Buscar mensagens não lidas desta conversa
    const messages = await query.select('whatsapp_messages', {
      instance_name: instanceName,
      phone_number: phoneNumber,
    });

    // Filtrar mensagens para marcar como lidas
    const toUpdate = messages.filter((msg: any) => {
      // Se messageIds foi especificado, usar apenas esses
      if (messageIds && Array.isArray(messageIds)) {
        return messageIds.includes(msg.message_id) && !msg.is_from_me;
      }
      // Caso contrário, marcar todas as mensagens recebidas como lidas
      return !msg.is_from_me && msg.status !== 'read';
    });

    // Atualizar cada mensagem
    let updatedCount = 0;
    for (const msg of toUpdate) {
      try {
        await query.update(
          'whatsapp_messages',
          { id: msg.id },
          { status: 'read' }
        );
        updatedCount++;
      } catch (updateError) {
        console.error(`Error updating message ${msg.id}:`, updateError);
      }
    }

    // Sincronizar com Evolution API (opcional, não deve travar a resposta)
    if (toUpdate.length > 0) {
      const messageIdsToSync = toUpdate.map(m => m.message_id);
      markAsReadEvolution(instanceName, phoneNumber, messageIdsToSync).catch(err => {
        console.error('[Evolution API] Error syncing read status:', err.message);
      });
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      message: `${updatedCount} mensagem(ns) marcada(s) como lida(s)`,
    });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
