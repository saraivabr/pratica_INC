import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { normalizePhone } from "@/lib/supabase";

/**
 * Órulo Webhook Handler (Simulated)
 * In a real scenario, this would be registered in Órulo's dashboard.
 */
/**
 * SECURITY: Validar token do webhook Orulo
 */
function validateWebhookToken(req: Request): boolean {
  const webhookToken = process.env.ORULO_WEBHOOK_TOKEN;
  if (!webhookToken) {
    console.error('[Orulo] ORULO_WEBHOOK_TOKEN não configurado. Rejeitando request.');
    return false;
  }
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${webhookToken}`) return true;
  const tokenHeader = req.headers.get('x-webhook-token');
  if (tokenHeader === webhookToken) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    // SECURITY: Validar token antes de processar
    if (!validateWebhookToken(req)) {
      console.error('[Orulo] Unauthorized webhook request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    
    // Órulo payload structure from PRD
    const { 
      realtor_name, 
      realtor_phone, 
      property_id, 
      realtor_company, 
      event 
    } = payload;

    if (event !== "property_viewed") {
      return NextResponse.json({ message: "Event ignored" });
    }

    const phone = normalizePhone(realtor_phone);

    // 1. Create or Update Lead in our Pipeline
    // Find the "Novo Lead" stage
    const stageRes = await dbQuery(
      `SELECT id FROM funnel_stages WHERE name = 'Novo Lead' LIMIT 1`
    );
    const stageId = stageRes.rows[0]?.id;

    // Find the funnel
    const funnelRes = await dbQuery(
      `SELECT id FROM funnels WHERE is_active = true LIMIT 1`
    );
    const funnelId = funnelRes.rows[0]?.id;

    if (!stageId || !funnelId) {
       return NextResponse.json({ error: "CRM not initialized" }, { status: 500 });
    }

    // Insert lead
    await dbQuery(
      `INSERT INTO leads (name, phone, funnel_id, stage_id, score, temperature, tags, custom_fields)
       VALUES ($1, $2, $3, $4, 70, 'warm', ARRAY['Orulo', 'Visita'], $5)
       ON CONFLICT (phone) DO UPDATE SET
         last_interaction_at = NOW(),
         score = LEAST(leads.score + 10, 100),
         temperature = 'hot'`,
      [realtor_name, phone, funnelId, stageId, JSON.stringify({ company: realtor_company, property_id })]
    );

    // 2. Queue a WhatsApp Message (Simulated)
    // In a real app, this would use Z-API or Sofia to send a welcome message
    console.log(`[Órulo Webhook] New lead from Órulo: ${realtor_name} (${phone}) interested in ${property_id}`);

    return NextResponse.json({ success: true, message: "Lead captured and processed" });
  } catch (error) {
    console.error("Orulo Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
