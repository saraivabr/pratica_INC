import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");

    // Se phone passado, retorna mensagens dessa conversa específica
    if (phone) {
      return getConversationMessages(phone);
    }

    // Listagem de conversas — LEVE, só metadata + última mensagem
    const res = await dbQuery(`
      WITH real_messages AS (
        SELECT *
        FROM whatsapp_messages
        WHERE phone_number IS NOT NULL 
          AND phone_number != ''
          AND phone_number ~ '^[0-9]{10,13}$'
          AND (raw_data IS NULL OR (
            raw_data->'key'->>'remoteJid' NOT LIKE '%@g.us'
            AND raw_data->'key'->>'remoteJid' NOT LIKE '%@broadcast'
            AND raw_data->'key'->>'remoteJid' NOT LIKE '%@newsletter'
          ))
      ),
      latest_messages AS (
        SELECT DISTINCT ON (phone_number)
          phone_number,
          contact_name,
          message_text,
          message_type,
          is_from_me,
          timestamp,
          instance_name
        FROM real_messages
        WHERE phone_number IS NOT NULL AND phone_number != ''
        ORDER BY phone_number, timestamp DESC
      ),
      unread_counts AS (
        SELECT phone_number, COUNT(*) as unread_count
        FROM real_messages
        WHERE is_from_me = false AND (status IS NULL OR status != 'read')
        GROUP BY phone_number
      ),
      msg_counts AS (
        SELECT phone_number, COUNT(*) as total_messages
        FROM real_messages
        GROUP BY phone_number
      )
      SELECT 
        lm.phone_number as id,
        lm.phone_number as contact_phone,
        COALESCE(
          sc.push_name,
          wc.contact_name, 
          CASE WHEN lm.contact_name IN ('Você', '') THEN NULL ELSE lm.contact_name END,
          lm.phone_number
        ) as contact_name,
        'lead' as contact_role,
        lm.message_text as last_message,
        lm.is_from_me as last_is_from_me,
        lm.timestamp as updated_at,
        lm.instance_name,
        COALESCE(uc.unread_count, 0) as unread_count,
        COALESCE(mc.total_messages, 0) as total_messages,
        COALESCE(sc.profile_picture_url, wc.profile_picture_url) as profile_picture_url
      FROM latest_messages lm
      LEFT JOIN whatsapp_contacts wc ON wc.phone_number = lm.phone_number
      LEFT JOIN whatsapp_synced_contacts sc ON sc.phone_number = lm.phone_number
      LEFT JOIN unread_counts uc ON uc.phone_number = lm.phone_number
      LEFT JOIN msg_counts mc ON mc.phone_number = lm.phone_number
      ORDER BY lm.timestamp DESC
      LIMIT 100
    `);

    const conversations = res.rows.map((row: any) => ({
      id: row.id,
      user_id: row.id,
      contact_name: row.contact_name || row.contact_phone,
      contact_phone: row.contact_phone,
      contact_email: null,
      contact_role: row.contact_role,
      // Incluir última mensagem como preview pra sidebar
      messages: [{
        id: "last",
        role: row.last_is_from_me ? "assistant" : "user",
        content: row.last_message || "",
        timestamp: row.updated_at,
        sender: row.last_is_from_me ? "Você" : row.contact_name,
      }],
      context: {},
      updated_at: row.updated_at,
      unread_count: parseInt(row.unread_count) || 0,
      total_messages: parseInt(row.total_messages) || 0,
      profile_picture_url: row.profile_picture_url,
      lead_data: {
        tags: [],
        stage: "contato_realizado",
        temperature: row.unread_count > 5 ? "hot" : row.unread_count > 0 ? "warm" : "cold",
      },
    }));

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("List Conversations Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function getConversationMessages(phone: string) {
  try {
    const res = await dbQuery(`
      SELECT message_id, contact_name, message_text, message_type,
             is_from_me, timestamp, media_url, caption, phone_number
      FROM whatsapp_messages
      WHERE phone_number = $1
        AND message_text IS NOT NULL
        AND message_text != ''
        AND timestamp >= NOW() - INTERVAL '30 days'
        AND (raw_data IS NULL OR (
          raw_data->'key'->>'remoteJid' NOT LIKE '%@g.us'
          AND raw_data->'key'->>'remoteJid' NOT LIKE '%@broadcast'
          AND raw_data->'key'->>'remoteJid' NOT LIKE '%@newsletter'
        ))
      ORDER BY timestamp ASC
      LIMIT 200
    `, [phone]);

    const messages = res.rows.map((msg: any) => ({
      id: msg.message_id,
      role: msg.is_from_me ? "assistant" : "user",
      content: msg.message_text,
      type: msg.message_type || "text",
      timestamp: msg.timestamp,
      sender: msg.is_from_me ? "Você" : msg.contact_name || phone,
      media_url: msg.media_url,
      caption: msg.caption,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get Messages Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
