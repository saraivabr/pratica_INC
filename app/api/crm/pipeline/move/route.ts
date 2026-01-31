import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from '@/lib/api-auth';
import { validateRequest, PipelineMoveSchema } from '@/lib/validation-schemas';

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req as NextRequest);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const validation = await validateRequest(req, PipelineMoveSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const { leadId, stageId } = validation.data;

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
