import { NextRequest, NextResponse } from 'next/server';
import {
  listConversations,
  getConversation,
  pauseBot,
  resumeBot,
  updateConversationStatus
} from '@/lib/salva-leads/conversation';

export const dynamic = 'force-dynamic';

// GET: Listar conversas
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const tenantId = parseInt(searchParams.get('tenantId') || '0');
  const status = searchParams.get('status') || undefined;
  const corretorId = searchParams.get('corretorId') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenantId is required' },
      { status: 400 }
    );
  }

  try {
    const conversations = await listConversations(tenantId, {
      status,
      corretorId,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      count: conversations.length,
      data: conversations,
      conversations
    });

  } catch (error: any) {
    console.error('[Salva-Leads API] Erro listando conversas:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: Atualizar conversa (pausar/retomar bot, mudar status)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    // Verificar se a conversa existe
    const conversation = await getConversation(id);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Executar ação
    if (action === 'pause' || body.bot_paused === true) {
      await pauseBot(id);
      return NextResponse.json({ success: true, message: 'Bot pausado' });
    }

    if (action === 'resume' || body.bot_paused === false) {
      await resumeBot(id);
      return NextResponse.json({ success: true, message: 'Bot retomado' });
    }

    if (status) {
      await updateConversationStatus(id, status);
      return NextResponse.json({ success: true, message: `Status atualizado para ${status}` });
    }

    return NextResponse.json(
      { error: 'No action specified' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[Salva-Leads API] Erro atualizando conversa:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
