import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId"); // Filter by owner if needed

    // Join conversations with leads (if linked) or users
    // Since Sofia's conversations are linked to 'users' (corretores) 
    // and we also have 'leads' (potential buyers), let's handle both.
    // For now, let's focus on listing conversations from the 'conversations' table.
    
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
      ORDER BY c.updated_at DESC
      LIMIT 50
    `);

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error("List Conversations Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
