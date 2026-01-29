import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/whatsapp/contact-info
 * Busca informações do contato via Evolution API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const instanceName = searchParams.get('instance');

    if (!phone || !instanceName) {
      return NextResponse.json(
        { error: 'phone e instance são obrigatórios' },
        { status: 400 }
      );
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionKey) {
      return NextResponse.json(
        { error: 'EVOLUTION_API_KEY não configurada' },
        { status: 500 }
      );
    }

    // Normalizar telefone (remover caracteres especiais)
    const normalizedPhone = phone.replace(/\D/g, '');
    const jid = normalizedPhone.includes('@')
      ? normalizedPhone
      : `${normalizedPhone}@s.whatsapp.net`;

    // Buscar informações do contato
    const res = await fetch(
      `${evolutionUrl}/chat/fetchProfile/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionKey,
        },
        body: JSON.stringify({
          number: jid,
        }),
      }
    );

    if (!res.ok) {
      console.error('[Contact Info] Evolution API error:', await res.text());
      return NextResponse.json(
        { error: 'Erro ao buscar contato' },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      contact: {
        phone: normalizedPhone,
        name: data.name || data.pushName || data.verifiedName || null,
        status: data.status || null,
        picture: data.picture || data.profilePicUrl || null,
      },
    });
  } catch (error: any) {
    console.error('[Contact Info API] Error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar contato' },
      { status: 500 }
    );
  }
}
