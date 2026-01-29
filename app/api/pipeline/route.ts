import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

interface PipelineStage {
  stage: string;
  display_name: string;
  emoji: string;
  count: number;
  leads: PipelineLead[];
}

interface PipelineLead {
  id: string;
  phone_number: string;
  contact_name: string;
  stage: string;
  temperature: string;
  last_message_at: string;
  last_message_text: string;
  last_message_from_me: boolean;
  total_messages: number;
  created_at: string;
  updated_at: string;
}

// Simplified stages (4 instead of 8)
const STAGES = [
  { stage: "new", display_name: "🆕 Novos", emoji: "🆕" },
  { stage: "waiting", display_name: "⏳ Aguardando", emoji: "⏳" },
  { stage: "active", display_name: "💬 Em Conversa", emoji: "💬" },
  { stage: "proposal", display_name: "📋 Proposta", emoji: "📋" },
  { stage: "cold", display_name: "❄️ Esfriou", emoji: "❄️" },
];

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = (user as any).tenant_id || 1;

    // Get conversation data with proper contact names
    const result = await dbQuery(`
      WITH conversation_stats AS (
        SELECT 
          wm.phone_number,
          -- Priority order for contact names: contacts.name > push_name > contact_name
          COALESCE(
            wc.name,
            NULLIF(wm.push_name, ''),
            NULLIF(wm.contact_name, ''),
            wm.phone_number
          ) as contact_name,
          COUNT(*) as total_messages,
          MAX(wm.timestamp) as last_message_at,
          STRING_AGG(
            wm.message_text, 
            ' ' ORDER BY wm.timestamp DESC
          )::TEXT as all_messages,
          (SELECT wm2.message_text 
           FROM whatsapp_messages wm2 
           WHERE wm2.phone_number = wm.phone_number 
           AND wm2.tenant_id = $1 
           ORDER BY wm2.timestamp DESC 
           LIMIT 1) as last_message_text,
          (SELECT wm2.is_from_me 
           FROM whatsapp_messages wm2 
           WHERE wm2.phone_number = wm.phone_number 
           AND wm2.tenant_id = $1 
           ORDER BY wm2.timestamp DESC 
           LIMIT 1) as last_message_from_me,
          EXTRACT(EPOCH FROM NOW() - MAX(wm.timestamp)) as seconds_since_last_message,
          -- Check if it's from CVCRM leads
          COALESCE(cl.nome, '') as cvcrm_name
        FROM whatsapp_messages wm
        LEFT JOIN whatsapp_contacts wc ON wc.phone_number = wm.phone_number AND wc.tenant_id = wm.tenant_id
        LEFT JOIN cvcrm_leads cl ON (
          cl.telefone = wm.phone_number OR 
          cl.celular = wm.phone_number OR
          REPLACE(REPLACE(REPLACE(cl.telefone, ' ', ''), '-', ''), '(', '') LIKE '%' || wm.phone_number || '%' OR
          REPLACE(REPLACE(REPLACE(cl.celular, ' ', ''), '-', ''), '(', '') LIKE '%' || wm.phone_number || '%'
        )
        WHERE wm.tenant_id = $1
        AND wm.timestamp >= NOW() - INTERVAL '90 days' -- Last 90 days only
        GROUP BY wm.phone_number, wc.name, cl.nome
      ),
      enriched_conversations AS (
        SELECT *,
          -- Use CVCRM name if available and current name is phone/generic
          CASE 
            WHEN cvcrm_name != '' AND (
              contact_name = phone_number OR 
              contact_name = 'Você' OR 
              contact_name = '' OR 
              contact_name IS NULL
            ) THEN cvcrm_name
            ELSE contact_name
          END as final_contact_name,
          -- Stage classification based on conversation content and timing
          CASE 
            WHEN total_messages <= 3 THEN 'new'
            WHEN seconds_since_last_message > 604800 THEN 'cold' -- 7+ days
            WHEN all_messages ILIKE '%proposta%' OR 
                 all_messages ILIKE '%valor%' OR 
                 all_messages ILIKE '%comprar%' OR 
                 all_messages ILIKE '%visita%' OR
                 all_messages ILIKE '%interessado%' THEN 'proposal'
            WHEN last_message_from_me = false AND seconds_since_last_message > 3600 THEN 'waiting' -- Waiting for our reply > 1 hour
            WHEN seconds_since_last_message < 86400 THEN 'active' -- Active in last 24h
            ELSE 'waiting'
          END as suggested_stage,
          -- Temperature based on engagement
          CASE 
            WHEN total_messages >= 10 AND seconds_since_last_message < 86400 THEN 'hot'
            WHEN total_messages >= 5 OR seconds_since_last_message < 172800 THEN 'warm' -- < 2 days
            ELSE 'cold'
          END as temperature
        FROM conversation_stats
      )
      SELECT *
      FROM enriched_conversations
      WHERE final_contact_name != 'Você' 
      AND final_contact_name != phone_number -- Filter out conversations where only name is phone number
      AND final_contact_name != ''
      AND final_contact_name IS NOT NULL
      AND total_messages >= 2 -- At least some conversation
      ORDER BY last_message_at DESC
    `, [tenantId]);

    const conversations = result.rows;
    
    // Group conversations by stage
    const pipeline: PipelineStage[] = STAGES.map(stageInfo => {
      const stageLeads = conversations
        .filter((conv: any) => conv.suggested_stage === stageInfo.stage)
        .map((conv: any) => ({
          id: conv.phone_number, // Use phone as ID since no pipeline_leads table
          phone_number: conv.phone_number,
          contact_name: conv.final_contact_name,
          stage: conv.suggested_stage,
          temperature: conv.temperature,
          last_message_at: conv.last_message_at ? new Date(conv.last_message_at).toISOString() : '',
          last_message_text: conv.last_message_text || '',
          last_message_from_me: conv.last_message_from_me || false,
          total_messages: conv.total_messages || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

      return {
        ...stageInfo,
        count: stageLeads.length,
        leads: stageLeads
      };
    });

    return NextResponse.json({ pipeline });
  } catch (error) {
    console.error("Pipeline GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phone_number, stage } = await request.json();

    if (!phone_number || !stage) {
      return NextResponse.json({ error: "Phone number and stage required" }, { status: 400 });
    }

    // Validate stage
    const validStages = STAGES.map(s => s.stage);
    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }

    // For now, we'll just return success since we're building stages dynamically
    // In a real implementation, you might want to store stage overrides in a separate table
    console.log(`Stage change requested: ${phone_number} -> ${stage}`);

    return NextResponse.json({ success: true, message: "Stage updated (virtual)" });
  } catch (error) {
    console.error("Pipeline PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Since we're building the pipeline dynamically from whatsapp_messages,
    // sync is essentially a refresh operation
    return NextResponse.json({ 
      success: true, 
      message: "Pipeline atualizado! Os dados são sincronizados automaticamente a partir das mensagens do WhatsApp."
    });
  } catch (error) {
    console.error("Pipeline POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}