import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Message {
  content: string;
  isFromMe: boolean;
  timestamp: string;
}

/**
 * POST /api/catavendas/analyze-intent
 * Analisa a intenção do lead baseado no histórico de mensagens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, workspaceId } = body;

    if (!phone || !workspaceId) {
      return NextResponse.json(
        { error: 'phone e workspaceId são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar histórico de mensagens
    const { rows } = await dbQuery(
      `SELECT message_text, is_from_me, timestamp
       FROM whatsapp_messages
       WHERE phone_number = $1
       AND workspace_id = $2
       AND message_text IS NOT NULL
       AND message_text != ''
       ORDER BY timestamp DESC
       LIMIT 50`,
      [phone, workspaceId]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        intent: {
          category: 'sem_historico',
          summary: 'Sem histórico de mensagens',
          confidence: 0,
        },
      });
    }

    // Montar histórico para análise (ordem cronológica)
    const messages: Message[] = rows
      .reverse()
      .map((row) => ({
        content: row.message_text,
        isFromMe: row.is_from_me,
        timestamp: row.timestamp,
      }));

    // Analisar com IA
    const analysis = await analyzeConversationIntent(messages);

    return NextResponse.json({
      success: true,
      intent: analysis,
    });
  } catch (error: any) {
    console.error('[Analyze Intent API] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao analisar intenção' },
      { status: 500 }
    );
  }
}

async function analyzeConversationIntent(messages: Message[]): Promise<{
  category: string;
  summary: string;
  confidence: number;
  suggestedAction?: string;
}> {
  try {
    // Formatar histórico
    const conversationText = messages
      .map((msg) => {
        const sender = msg.isFromMe ? 'CORRETOR' : 'LEAD';
        return `${sender}: ${msg.content}`;
      })
      .join('\n');

    const prompt = `Analise esta conversa entre um corretor de imóveis e um lead:

${conversationText}

Retorne um JSON com:
{
  "category": "uma das opções: interessado|negociando|duvidas|sem_interesse|perdeu_contato|preco_alto|comparando",
  "summary": "resumo em 1-2 frases da situação atual do lead",
  "confidence": número de 0 a 1 indicando confiança na análise,
  "suggestedAction": "sugestão do que o corretor deve fazer para recuperar o lead"
}

Seja objetivo e direto. Categorias:
- interessado: demonstrou interesse real no imóvel
- negociando: em processo de negociação/proposta
- duvidas: tinha dúvidas sobre localização, preço, planta
- sem_interesse: deixou claro que não quer
- perdeu_contato: simplesmente parou de responder
- preco_alto: achou caro demais
- comparando: está comparando com outras opções

Retorne APENAS o JSON, sem texto adicional.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      category: analysis.category || 'perdeu_contato',
      summary: analysis.summary || 'Análise indisponível',
      confidence: analysis.confidence || 0.5,
      suggestedAction: analysis.suggestedAction || '',
    };
  } catch (error) {
    console.error('[Analyze Intent] Error:', error);

    // Fallback: análise simples baseada em regras
    const lastMessage = messages[messages.length - 1];
    const daysSince = Math.floor(
      (Date.now() - new Date(lastMessage.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      category: 'perdeu_contato',
      summary: `Última mensagem há ${daysSince} dias. Análise automática indisponível.`,
      confidence: 0.3,
      suggestedAction: 'Retome o contato perguntando se ainda tem interesse',
    };
  }
}
