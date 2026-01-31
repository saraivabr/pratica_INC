import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { validateRequest, CampaignCreateSchema } from '@/lib/validation-schemas';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const res = await dbQuery(
      `SELECT * FROM campaigns WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [ctx.workspaceId]
    );
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    if (ctx.user.role !== 'admin' && ctx.user.role !== 'gerente') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const validation = await validateRequest(req, CampaignCreateSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const { name, message_template, segmentation_config, scheduled_at } = validation.data;

    // 1. Create Campaign with workspace_id
    const campRes = await dbQuery(
      `INSERT INTO campaigns (name, message_template, segmentation_config, status, scheduled_at, workspace_id)
       VALUES ($1, $2, $3, 'scheduled', $4, $5)
       RETURNING *`,
      [name, message_template, segmentation_config, scheduled_at || new Date().toISOString(), ctx.workspaceId]
    );
    const campaign = campRes.rows[0];

    // 2. Select Leads filtered by workspace
    let query = `SELECT id FROM leads WHERE workspace_id = $1`;
    const params: any[] = [ctx.workspaceId];

    if (segmentation_config?.stage_id) {
        params.push(segmentation_config.stage_id);
        query += ` AND stage_id = $${params.length}`;
    }

    const leadsRes = await dbQuery(query, params);
    const leads = leadsRes.rows;

    // 3. Populate Campaign Leads with workspace_id
    for (const lead of leads) {
        await dbQuery(
            `INSERT INTO campaign_leads (campaign_id, lead_id, workspace_id) VALUES ($1, $2, $3)`,
            [campaign.id, lead.id, ctx.workspaceId]
        );
    }

    // Update stats
    await dbQuery(
        `UPDATE campaigns SET stats = jsonb_set(stats, '{total}', $1) WHERE id = $2 AND workspace_id = $3`,
        [String(leads.length), campaign.id, ctx.workspaceId]
    );

    return NextResponse.json({ ...campaign, total_leads: leads.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
