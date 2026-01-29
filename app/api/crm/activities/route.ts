import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    let query = `
      SELECT
        a.*,
        l.name as lead_name,
        l.phone as lead_phone
      FROM activities a
      LEFT JOIN leads l ON a.lead_id = l.id AND l.workspace_id = $1
      WHERE a.workspace_id = $1
    `;
    const params: any[] = [workspaceId];

    if (userId) {
      params.push(userId);
      query += ` AND a.user_id = $${params.length}`;
    }

    query += ` ORDER BY a.scheduled_at ASC`;

    const res = await dbQuery(query, params);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("Activities API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const body = await req.json();
    const { lead_id, user_id, title, description, activity_type, scheduled_at, priority } = body;

    const res = await dbQuery(
      `INSERT INTO activities (workspace_id, lead_id, user_id, title, description, activity_type, scheduled_at, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [workspaceId, lead_id, user_id, title, description, activity_type, scheduled_at, priority || 'medium']
    );

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    console.error("Activities Create Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const body = await req.json();
    const { id, status, completed_at, outcome, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${paramIndex++}`);
    }
    if (completed_at !== undefined) {
      params.push(completed_at);
      updates.push(`completed_at = $${paramIndex++}`);
    }
    if (outcome !== undefined) {
      params.push(outcome);
      updates.push(`outcome = $${paramIndex++}`);
    }
    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${paramIndex++}`);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const res = await dbQuery(
      `UPDATE activities SET ${updates.join(", ")} WHERE workspace_id = $1 AND id = $${paramIndex} RETURNING *`,
      params
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    console.error("Activities Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    const res = await dbQuery(
      `DELETE FROM activities WHERE workspace_id = $1 AND id = $2 RETURNING id`,
      [workspaceId, id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Activities Delete Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
