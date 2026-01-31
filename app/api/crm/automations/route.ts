import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { validateRequest, AutomationCreateSchema, AutomationUpdateSchema } from '@/lib/validation-schemas';

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const res = await dbQuery(
      `SELECT * FROM automations WHERE workspace_id = $1 ORDER BY created_at DESC`,
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

    const validation = await validateRequest(req, AutomationCreateSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const { name, trigger_type, trigger_config, action_type, action_config } = validation.data;

    const res = await dbQuery(
      `INSERT INTO automations (name, trigger_type, trigger_config, action_type, action_config, workspace_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, trigger_type, trigger_config, action_type, action_config, ctx.workspaceId]
    );

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    if (ctx.user.role !== 'admin' && ctx.user.role !== 'gerente') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const validation = await validateRequest(req, AutomationUpdateSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const { id, is_active, name, trigger_type, trigger_config, action_type, action_config } = validation.data;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (is_active !== undefined) {
      params.push(is_active);
      updates.push(`is_active = $${paramIndex++}`);
    }
    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${paramIndex++}`);
    }
    if (trigger_type !== undefined) {
      params.push(trigger_type);
      updates.push(`trigger_type = $${paramIndex++}`);
    }
    if (trigger_config !== undefined) {
      params.push(trigger_config);
      updates.push(`trigger_config = $${paramIndex++}`);
    }
    if (action_type !== undefined) {
      params.push(action_type);
      updates.push(`action_type = $${paramIndex++}`);
    }
    if (action_config !== undefined) {
      params.push(action_config);
      updates.push(`action_config = $${paramIndex++}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);
    params.push(ctx.workspaceId);

    const res = await dbQuery(
      `UPDATE automations SET ${updates.join(", ")} WHERE id = $${paramIndex} AND workspace_id = $${paramIndex + 1} RETURNING *`,
      params
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    console.error("Automations Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    if (ctx.user.role !== 'admin' && ctx.user.role !== 'gerente') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Automation ID is required" }, { status: 400 });
    }

    const res = await dbQuery(
      `DELETE FROM automations WHERE id = $1 AND workspace_id = $2 RETURNING id`,
      [id, ctx.workspaceId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Automations Delete Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
