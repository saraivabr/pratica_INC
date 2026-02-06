import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { applyRateLimit } from '@/lib/rate-limit-helper';

export const dynamic = 'force-dynamic';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
    _openai = new OpenAI({ apiKey, timeout: 30000 });
  }
  return _openai;
}

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResponse = await applyRateLimit(request, 'AI_CHAT', 'transcribe');
    if (rateLimitResponse) return rateLimitResponse;

    // Auth
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: 'Arquivo de áudio não enviado' }, { status: 400 });
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx 10MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const file = new File([buffer], 'audio.webm', { type: audioFile.type || 'audio/webm' });

    const response = await getOpenAI().audio.transcriptions.create({
      model: 'gpt-4o-mini-transcribe',
      file,
      language: 'pt',
    });

    const text = typeof response === 'string' ? response : response.text;

    return NextResponse.json({ text: text?.trim() || '' });
  } catch (error: any) {
    console.error('[transcribe] Error:', error?.message || error);
    return NextResponse.json(
      { error: 'Erro ao transcrever áudio' },
      { status: 500 }
    );
  }
}
