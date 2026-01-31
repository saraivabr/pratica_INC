import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { leadId, stageId } = await req.json();

    if (!leadId || !stageId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbQuery(
      `UPDATE leads SET stage_id = $1, updated_at = NOW(), last_interaction_at = NOW() WHERE id = $2`,
      [stageId, leadId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pipeline Move Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
