import { NextRequest, NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, category, properties, timestamp, url, userAgent } = body

    // Inserir evento de analytics no banco
    await dbQuery(
      `INSERT INTO analytics_events (
        event_name,
        category,
        properties,
        url,
        user_agent,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        name,
        category,
        JSON.stringify(properties || {}),
        url,
        userAgent,
        timestamp || new Date().toISOString()
      ]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}
