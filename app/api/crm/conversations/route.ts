import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const res = await dbQuery(`
      SELECT 
        c.id,
        c.user_id,
        u.nome as contact_name,
        u.telefone as contact_phone,
        u.role as contact_role,
        c.messages,
        c.context,
        c.updated_at
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.workspace_id = $1
      ORDER BY c.updated_at DESC
      LIMIT 50
    `, [ctx.workspaceId]);

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("List Conversations Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
