import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export async function GET() {
  try {
    const res = await dbQuery(`SELECT * FROM campaigns ORDER BY created_at DESC`);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, message_template, segmentation_config, scheduled_at } = body;

    // 1. Create Campaign
    const campRes = await dbQuery(
      `INSERT INTO campaigns (name, message_template, segmentation_config, status, scheduled_at)
       VALUES ($1, $2, $3, 'scheduled', $4)
       RETURNING *`,
      [name, message_template, segmentation_config, scheduled_at || new Date().toISOString()]
    );
    const campaign = campRes.rows[0];

    // 2. Select Leads based on segmentation (Simulated filter for now)
    // E.g., if segmentation_config has "stage_id", filter by it.
    let query = `SELECT id FROM leads WHERE 1=1`;
    const params = [];
    
    if (segmentation_config?.stage_id) {
        params.push(segmentation_config.stage_id);
        query += ` AND stage_id = $${params.length}`;
    }

    const leadsRes = await dbQuery(query, params);
    const leads = leadsRes.rows;

    // 3. Populate Campaign Leads
    for (const lead of leads) {
        await dbQuery(
            `INSERT INTO campaign_leads (campaign_id, lead_id) VALUES ($1, $2)`,
            [campaign.id, lead.id]
        );
    }

    // Update stats
    await dbQuery(
        `UPDATE campaigns SET stats = jsonb_set(stats, '{total}', $1) WHERE id = $2`,
        [String(leads.length), campaign.id]
    );

    return NextResponse.json({ ...campaign, total_leads: leads.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
