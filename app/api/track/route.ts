import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { validateRequest, TrackEventSchema } from "@/lib/validation-schemas";

export async function POST(request: Request) {
  try {
    const validation = await validateRequest(request, TrackEventSchema);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const { userId, eventType, page, data } = validation.data;

    if (!userId || !eventType || !page) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    // Look up workspace_id from user
    const { rows } = await dbQuery(
      `SELECT workspace_id FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const workspaceId = rows[0]?.workspace_id;
    if (!workspaceId) {
      // Skip tracking if user has no workspace — don't error
      return NextResponse.json({ success: true });
    }

    await dbQuery(
      `INSERT INTO tracking_events (user_id, event_type, page, data, workspace_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, eventType, page, data || {}, workspaceId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking event:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
