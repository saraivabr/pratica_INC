/**
 * Salva-Leads Config API
 * 
 * GET /api/salva-leads/config - Get corretor's silence monitor config
 * PUT /api/salva-leads/config - Update corretor's config
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorretorConfig, saveCorretorConfig } from '@/lib/salva-leads/silence-monitor';
import { requireUser } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getCorretorConfig(user.id);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('[Salva-Leads Config] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate fields
    const validFields: Record<string, (v: any) => boolean> = {
      autoAssistantEnabled: (v) => typeof v === 'boolean',
      silenceTimeoutMinutes: (v) => typeof v === 'number' && v >= 1 && v <= 60,
      businessHoursStart: (v) => typeof v === 'number' && v >= 0 && v <= 23,
      businessHoursEnd: (v) => typeof v === 'number' && v >= 0 && v <= 23,
      assistantName: (v) => typeof v === 'string' && v.length >= 1 && v.length <= 100,
    };

    const updates: any = {};
    for (const [key, validator] of Object.entries(validFields)) {
      if (key in body) {
        if (!validator(body[key])) {
          return NextResponse.json(
            { error: `Invalid value for ${key}` },
            { status: 400 }
          );
        }
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const workspaceId = (user as any).workspace_id || 0;
    await saveCorretorConfig(user.id, workspaceId, updates);

    // Return updated config
    const config = await getCorretorConfig(user.id);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('[Salva-Leads Config] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
