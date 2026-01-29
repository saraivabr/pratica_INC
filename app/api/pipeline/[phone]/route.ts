import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

interface WhatsAppMessage {
  id: number;
  phone_number: string;
  contact_name: string;
  message_text: string;
  is_from_me: boolean;
  timestamp: string;
  tenant_id: number;
}

interface LeadDetail {
  id: number;
  phone_number: string;
  contact_name: string;
  stage: string;
  temperature: string;
  interest: string;
  ai_summary: string;
  ai_suggested_action: string;
  last_message_at: string;
  last_message_text: string;
  last_message_from_me: boolean;
  total_messages: number;
  profile_picture_url: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  stage_changed_at: string;
  messages: WhatsAppMessage[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = (user as any).tenant_id || 1;
    const decodedPhone = decodeURIComponent(phone);

    // Get lead details
    const leadResult = await dbQuery(`
      SELECT * FROM pipeline_leads 
      WHERE phone_number = $1 AND tenant_id = $2
    `, [decodedPhone, tenantId]);

    if (leadResult.rows.length === 0) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const lead = leadResult.rows[0];

    // Get last 30 messages for this contact
    const messagesResult = await dbQuery(`
      SELECT 
        id, phone_number, contact_name, message_text, 
        is_from_me, timestamp, tenant_id
      FROM whatsapp_messages 
      WHERE phone_number = $1 AND tenant_id = $2
      ORDER BY timestamp DESC 
      LIMIT 30
    `, [decodedPhone, tenantId]);

    // Generate AI summary if not exists
    let aiSummary = lead.ai_summary;
    let aiSuggestedAction = lead.ai_suggested_action;

    if (!aiSummary && messagesResult.rows.length > 0) {
      try {
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
          const messages = messagesResult.rows.reverse(); // Chronological order for AI
          const conversation = messages.map(msg => 
            `${msg.is_from_me ? 'Corretor' : lead.contact_name || 'Cliente'}: ${msg.message_text}`
          ).join('\n');

          const prompt = `Analise esta conversa de WhatsApp entre um corretor de imóveis e um cliente interessado. Forneça um resumo natural em português brasileiro sobre:
1. O interesse do cliente (qual imóvel, orçamento, necessidades)
2. O estágio da negociação
3. Principais objeções ou dúvidas
4. Sugestão de próxima ação para o corretor

Conversa:
${conversation}

Responda em JSON com:
{
  "summary": "Resumo natural da conversa...",
  "suggested_action": "Próxima ação sugerida..."
}`;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { 
                  temperature: 0.7,
                  maxOutputTokens: 1000
                }
              })
            }
          );

          if (response.ok) {
            const aiResponse = await response.json();
            const aiText = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (aiText) {
              try {
                // Try to parse as JSON
                const cleanText = aiText.replace(/```json\n?|\n?```/g, '');
                const aiData = JSON.parse(cleanText);
                aiSummary = aiData.summary;
                aiSuggestedAction = aiData.suggested_action;
              } catch {
                // If not JSON, use the raw text as summary
                aiSummary = aiText;
                aiSuggestedAction = 'Continuar acompanhamento do lead';
              }

              // Update the database with AI analysis
              await dbQuery(`
                UPDATE pipeline_leads 
                SET ai_summary = $1, ai_suggested_action = $2, updated_at = NOW()
                WHERE phone_number = $3 AND tenant_id = $4
              `, [aiSummary, aiSuggestedAction, decodedPhone, tenantId]);
            }
          }
        }
      } catch (error) {
        console.error('AI analysis error:', error);
        // Continue without AI summary
      }
    }

    const leadDetail: LeadDetail = {
      ...lead,
      ai_summary: aiSummary || 'Análise em andamento...',
      ai_suggested_action: aiSuggestedAction || 'Aguardar análise...',
      created_at: new Date(lead.created_at).toISOString(),
      updated_at: new Date(lead.updated_at).toISOString(),
      stage_changed_at: new Date(lead.stage_changed_at).toISOString(),
      last_message_at: lead.last_message_at ? new Date(lead.last_message_at).toISOString() : '',
      messages: messagesResult.rows.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp).toISOString()
      })).reverse() // Most recent first for display
    };

    return NextResponse.json({ lead: leadDetail });
  } catch (error) {
    console.error("Lead detail GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}