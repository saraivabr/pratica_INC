import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export async function GET() {
  try {
    const res = await dbQuery(`SELECT * FROM automations ORDER BY created_at DESC`);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, trigger_type, trigger_config, action_type, action_config } = body;

    const res = await dbQuery(
      `INSERT INTO automations (name, trigger_type, trigger_config, action_type, action_config)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, trigger_type, trigger_config, action_type, action_config]
    );

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_active, name, trigger_type, trigger_config, action_type, action_config } = body;

    if (!id) {
      return NextResponse.json({ error: "Automation ID is required" }, { status: 400 });
    }

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

    const res = await dbQuery(
      `UPDATE automations SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Automation ID is required" }, { status: 400 });
    }

    const res = await dbQuery(`DELETE FROM automations WHERE id = $1 RETURNING id`, [id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Automations Delete Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
