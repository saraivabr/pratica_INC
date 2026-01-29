// CataVendas Manual Response API

import { NextRequest, NextResponse } from 'next/server';
import { processApiMessage } from '@/lib/catavendas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, instance } = body;

    if (!message || !instance) {
      return NextResponse.json(
        { success: false, error: 'Missing message or instance in body' },
        { status: 400 }
      );
    }

    console.log(`[CataVendas API] Processing message for instance ${instance}: "${message}"`);

    const result = await processApiMessage(instance, message);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[CataVendas API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const message = searchParams.get('message');
    const instance = searchParams.get('instance');

    if (!message || !instance) {
      return NextResponse.json(
        { success: false, error: 'Missing message or instance parameter' },
        { status: 400 }
      );
    }

    console.log(`[CataVendas API] GET Processing message for instance ${instance}: "${message}"`);

    const result = await processApiMessage(instance, message);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[CataVendas API] GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}