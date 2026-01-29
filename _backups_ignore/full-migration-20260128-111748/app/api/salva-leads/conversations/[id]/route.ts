import { NextRequest, NextResponse } from 'next/server';
import { getConversation } from '@/lib/salva-leads/conversation';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'Invalid id' },
      { status: 400 }
    );
  }

  try {
    const conversation = await getConversation(id);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation
    });

  } catch (error: any) {
    console.error('[Salva-Leads API] Erro buscando conversa:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
