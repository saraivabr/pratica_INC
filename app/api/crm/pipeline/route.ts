import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    // Authenticate and get tenant context
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    // 1. Get Default Funnel (or first available) - filtered by tenant
    const funnelRes = await dbQuery(
      `SELECT id FROM funnels WHERE workspace_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1`,
      [workspaceId]
    );
    let funnelId = funnelRes.rows[0]?.id;

    // If no funnel exists, we might need to rely on the setup script,
    // but let's handle the empty case gracefully or return error.
    if (!funnelId) {
      return NextResponse.json({ error: "No active funnel found. Run setup script." }, { status: 404 });
    }

    // 2. Get Stages - filtered by tenant
    const stagesRes = await dbQuery(
      `SELECT * FROM funnel_stages WHERE workspace_id = $1 AND funnel_id = $2 ORDER BY position ASC`,
      [workspaceId, funnelId]
    );

    // 3. Get Leads - filtered by tenant
    // We only get leads that are in this funnel
    const leadsRes = await dbQuery(
      `SELECT * FROM leads WHERE workspace_id = $1 AND funnel_id = $2 AND stage_id IS NOT NULL`,
      [workspaceId, funnelId]
    );

    return NextResponse.json({
      funnelId,
      stages: stagesRes.rows,
      leads: leadsRes.rows,
    });
  } catch (error) {
    console.error("Pipeline API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate and get tenant context
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    const body = await req.json();
    const { name, email, phone, source, user_id, stage_id, temperature, tags } = body;

    if (!name) {
      return NextResponse.json({ error: "Lead name is required" }, { status: 400 });
    }

    // Get default funnel - filtered by tenant
    const funnelRes = await dbQuery(
      `SELECT id FROM funnels WHERE workspace_id = $1 AND is_active = true ORDER BY created_at ASC LIMIT 1`,
      [workspaceId]
    );
    const funnelId = funnelRes.rows[0]?.id;

    if (!funnelId) {
      return NextResponse.json({ error: "No active funnel found" }, { status: 404 });
    }

    // If no stage_id provided, get the first stage of the funnel - filtered by tenant
    let leadStageId = stage_id;
    if (!leadStageId) {
      const stageRes = await dbQuery(
        `SELECT id FROM funnel_stages WHERE workspace_id = $1 AND funnel_id = $2 ORDER BY position ASC LIMIT 1`,
        [workspaceId, funnelId]
      );
      leadStageId = stageRes.rows[0]?.id;
    }

    // Insert lead with workspace_id
    const res = await dbQuery(
      `INSERT INTO leads (workspace_id, funnel_id, stage_id, user_id, name, email, phone, source, temperature)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        workspaceId,
        funnelId,
        leadStageId,
        user_id || null,
        name,
        email || null,
        phone || null,
        source || 'manual',
        temperature || 'cold'
      ]
    );

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    console.error("Pipeline Create Lead Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
