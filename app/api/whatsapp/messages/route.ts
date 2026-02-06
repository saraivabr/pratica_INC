/**
 * API: Listar Mensagens WhatsApp
 *
 * GET /api/whatsapp/messages?instance=xxx          → lista conversas (agregado)
 * GET /api/whatsapp/messages?instance=xxx&phone=xxx → mensagens de uma conversa
 * PATCH /api/whatsapp/messages                     → marcar como lidas
 *
 * SECURITY: All queries filter by instance_name to ensure corretors
 * only see their own conversations within a workspace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findUserWorkspace, withTenant } from '@/lib/tenant-context';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { markAsRead as markAsReadEvolution } from '@/lib/evolution-api';
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';
import { getMongoDb } from '@/lib/mongodb';

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
    const userInstanceName = user.evolution_instance_name;

    const searchParams = request.nextUrl.searchParams;
    const instanceName = searchParams.get('instance');
    const phoneNumber = searchParams.get('phone');

    // If phone is provided without instance, return just the AI analysis (for lead-panel)
    if (!instanceName && phoneNumber) {
      let aiAnalysis = null;
      try {
        const db = getMongoDb();
        const filter: Record<string, any> = { workspace_id: workspaceId, phone_number: phoneNumber };
        if (userInstanceName) filter.instance_name = userInstanceName;
        const conv = await db.collection('conversations').findOne(filter);
        aiAnalysis = conv?.ai_analysis || null;
      } catch {
        // MongoDB unavailable
      }
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        unread_count: 0,
        ai_analysis: aiAnalysis,
      });
    }

    if (!instanceName) {
      return NextResponse.json(
        { success: false, error: 'Nome da instância é obrigatório' },
        { status: 400 }
      );
    }

    // Security: ensure the user can only query their own instance
    if (userInstanceName && instanceName !== userInstanceName) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado: instância não pertence a este usuário' },
        { status: 403 }
      );
    }

    // If user has no instance connected, return empty
    if (!userInstanceName) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        total_unread: 0,
      });
    }

    // ── Single conversation: return messages ────────────────────────────
    if (phoneNumber) {
      return await withTenant(workspaceId, async (client) => {
        const { rows: messages } = await client.query(
          `SELECT * FROM whatsapp_messages
           WHERE workspace_id = $1 AND instance_name = $2 AND phone_number = $3
           ORDER BY timestamp ASC`,
          [workspaceId, instanceName, phoneNumber]
        );

        const unreadCount = messages.filter(
          (m: any) => !m.is_from_me && m.status !== 'read'
        ).length;

        // AI analysis from MongoDB (filtered by instance)
        let aiAnalysis = null;
        try {
          const db = getMongoDb();
          const conv = await db.collection('conversations').findOne({
            workspace_id: workspaceId,
            phone_number: phoneNumber,
            instance_name: instanceName,
          });
          aiAnalysis = conv?.ai_analysis || null;
        } catch {
          // MongoDB unavailable
        }

        return NextResponse.json({
          success: true,
          data: messages,
          total: messages.length,
          unread_count: unreadCount,
          ai_analysis: aiAnalysis,
        });
      });
    }

    // ── Conversation list: use efficient SQL aggregation ─────────────────
    return await withTenant(workspaceId, async (client) => {
      // Single SQL query with DISTINCT ON — filtered by instance_name
      const { rows: conversations } = await client.query(
        `SELECT DISTINCT ON (m.phone_number)
           m.phone_number,
           m.message_text,
           m.message_type,
           m.timestamp,
           m.is_from_me,
           m.contact_name,
           c.contact_name AS pg_contact_name,
           c.profile_picture_url AS pg_profile_pic,
           c.lead_id
         FROM whatsapp_messages m
         LEFT JOIN whatsapp_contacts c
           ON c.phone_number = m.phone_number
           AND c.workspace_id = m.workspace_id
           AND c.instance_name = m.instance_name
         WHERE m.workspace_id = $1 AND m.instance_name = $2
         ORDER BY m.phone_number, m.timestamp DESC`,
        [workspaceId, instanceName]
      );

      // Unread counts — filtered by instance_name
      const { rows: unreadRows } = await client.query(
        `SELECT phone_number, COUNT(*) as unread
         FROM whatsapp_messages
         WHERE workspace_id = $1 AND instance_name = $2
           AND is_from_me = false AND status != 'read'
         GROUP BY phone_number`,
        [workspaceId, instanceName]
      );
      const unreadMap = new Map(unreadRows.map((r: any) => [r.phone_number, parseInt(r.unread)]));

      // Enrich from MongoDB (batch — 2 queries total)
      let mongoContactMap = new Map<string, any>();
      let mongoConvMap = new Map<string, any>();
      try {
        const db = getMongoDb();
        const phones = conversations.map((c: any) => c.phone_number);

        const [mongoContacts, mongoConvs] = await Promise.all([
          db.collection('contacts')
            .find({ workspace_id: workspaceId, instance_name: instanceName, phone_number: { $in: phones } })
            .toArray(),
          db.collection('conversations')
            .find({ workspace_id: workspaceId, instance_name: instanceName, phone_number: { $in: phones } })
            .toArray(),
        ]);

        mongoContactMap = new Map(mongoContacts.map((c) => [c.phone_number, c]));
        mongoConvMap = new Map(mongoConvs.map((c) => [c.phone_number, c]));
      } catch {
        // MongoDB unavailable
      }

      // Build response
      const data = conversations
        .map((msg: any) => {
          const mc = mongoContactMap.get(msg.phone_number);
          const mongoConv = mongoConvMap.get(msg.phone_number);

          const contactName =
            mc?.push_name ||
            mc?.contact_name ||
            msg.pg_contact_name ||
            msg.contact_name ||
            mongoConv?.contact_name ||
            msg.phone_number;

          const profilePicUrl =
            mc?.profile_picture_url ||
            msg.pg_profile_pic ||
            mongoConv?.profile_picture_url ||
            null;

          return {
            phone_number: msg.phone_number,
            contact_name: contactName,
            profile_picture_url: profilePicUrl,
            last_message: msg.message_text,
            last_message_type: msg.message_type,
            last_message_time: msg.timestamp,
            is_from_me: msg.is_from_me,
            unread_count: unreadMap.get(msg.phone_number) || 0,
            lead_id: msg.lead_id || mongoConv?.matched_lead_id,
            is_lead: !!(msg.lead_id || mongoConv?.matched_lead_id),
            labels: mongoConv?.labels || [],
            archived: mongoConv?.archived || false,
            pinned: mongoConv?.pinned || false,
            ai_summary: mongoConv?.ai_analysis?.summary || null,
            ai_sentiment: mongoConv?.ai_analysis?.sentiment || null,
            ai_temperature: mongoConv?.ai_analysis?.temperature || null,
          };
        })
        // Sort by last message time descending
        .sort((a: any, b: any) =>
          new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
        );

      const totalUnread = Array.from(unreadMap.values()).reduce((a, b) => a + b, 0);

      return NextResponse.json({
        success: true,
        data,
        total: data.length,
        total_unread: totalUnread,
      });
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

    // Security: ensure user can only mark-read their own instance's messages
    const userInstanceName = user.evolution_instance_name;
    if (userInstanceName && instanceName !== userInstanceName) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      );
    }

    return await withTenant(workspaceId, async (client) => {
      let updatedCount = 0;

      if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
        // Mark specific messages as read — filtered by instance_name
        const result = await client.query(
          `UPDATE whatsapp_messages
           SET status = 'read'
           WHERE workspace_id = $1
             AND instance_name = $2
             AND phone_number = $3
             AND message_id = ANY($4)
             AND is_from_me = false
             AND status != 'read'`,
          [workspaceId, instanceName, phoneNumber, messageIds]
        );
        updatedCount = result.rowCount || 0;
      } else {
        // Mark all unread messages from this phone as read — filtered by instance_name
        const result = await client.query(
          `UPDATE whatsapp_messages
           SET status = 'read'
           WHERE workspace_id = $1
             AND instance_name = $2
             AND phone_number = $3
             AND is_from_me = false
             AND status != 'read'`,
          [workspaceId, instanceName, phoneNumber]
        );
        updatedCount = result.rowCount || 0;
      }

      // Sync with Evolution API (non-blocking)
      if (updatedCount > 0) {
        markAsReadEvolution(instanceName, phoneNumber, messageIds || []).catch(err => {
          console.error('[Evolution API] Error syncing read status:', err.message);
        });
      }

      return NextResponse.json({
        success: true,
        updated: updatedCount,
        message: `${updatedCount} mensagem(ns) marcada(s) como lida(s)`,
      });
    });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
