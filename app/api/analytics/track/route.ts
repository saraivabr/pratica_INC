import { NextRequest, NextResponse } from "next/server"
import { withTenant } from "@/lib/tenant-context"
import { requireWorkspaceContext } from "@/lib/api-helpers"
import { validateRequest, TrackEventSchema } from "@/lib/validation-schemas"

export async function POST(request: NextRequest) {
  // 1. Authentication
  const ctx = await requireWorkspaceContext(request)
  if (ctx.error) return ctx.error

  // 2. Validation (own try-catch so parse errors return 400, not 500)
  let data: typeof TrackEventSchema._output
  try {
    const validation = await validateRequest(request, TrackEventSchema)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 })
    }
    data = validation.data
  } catch (error) {
    console.error('Analytics validation error:', error)
    return NextResponse.json(
      { error: 'Corpo da requisição inválido ou ausente' },
      { status: 400 }
    )
  }

  // 3. Database insert
  try {
    return await withTenant(ctx.workspaceId, async (client) => {
      const { name, category, properties, timestamp, url, userAgent } = data

      await client.query(
        `INSERT INTO analytics_events (
          event_name,
          category,
          properties,
          url,
          user_agent,
          created_at,
          workspace_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          name,
          category,
          JSON.stringify(properties || {}),
          url,
          userAgent,
          timestamp || new Date().toISOString(),
          ctx.workspaceId
        ]
      )

      return NextResponse.json({ success: true })
    })
  } catch (error) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    )
  }
}
