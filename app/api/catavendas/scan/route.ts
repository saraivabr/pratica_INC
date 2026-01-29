// CataVendas Manual Scan API

import { NextRequest, NextResponse } from 'next/server';
import { scanLeadsForInstance } from '@/lib/catavendas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');

    if (!instanceName) {
      return NextResponse.json(
        { success: false, error: 'Missing instance parameter' },
        { status: 400 }
      );
    }

    console.log(`[CataVendas API] Scanning leads for instance: ${instanceName}`);

    const result = await scanLeadsForInstance(instanceName);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[CataVendas API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceName } = body;

    if (!instanceName) {
      return NextResponse.json(
        { success: false, error: 'Missing instanceName in body' },
        { status: 400 }
      );
    }

    console.log(`[CataVendas API] POST scan for instance: ${instanceName}`);

    const result = await scanLeadsForInstance(instanceName);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[CataVendas API] POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}