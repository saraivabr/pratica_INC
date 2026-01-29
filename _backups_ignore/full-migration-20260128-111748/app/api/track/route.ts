import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { userId, eventType, page, data } = await request.json();

    if (!userId || !eventType || !page) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    await dbQuery(
      `insert into tracking_events (user_id, event_type, page, data)
       values ($1, $2, $3, $4)`,
      [userId, eventType, page, data || {}]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking event:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
