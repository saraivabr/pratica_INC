import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { sendTextMessage } from '@/lib/evolution-api';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface RecoverLeadRequest {
  phone: string;
  contactName: string;
  lastMessage: string;
  intent?: {
    category: string;
    summary: string;
    suggestedAction?: string;
  };
}

/**
 * POST /api/catavendas/recover-leads
 * Envia mensagens de recuperação para leads selecionados
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leads, workspaceId, instanceName } = body as {
      leads: RecoverLeadRequest[];
      workspaceId: number;
      instanceName: string;
    };

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum lead selecionado' },
        { status: 400 }
      );
    }

    if (!workspaceId || !instanceName) {
      return NextResponse.json(
        { error: 'workspaceId e instanceName são obrigatórios' },
        { status: 400 }
      );
    }

    const results: Array<{
      phone: string;
      success: boolean;
      message?: string;
      error?: string;
    }> = [];

    // Processar cada lead
    for (const lead of leads) {
      try {
        // Gerar mensagem personalizada
        const recoveryMessage = await generateRecoveryMessage(lead);

        // Enviar mensagem via Evolution API
        await sendTextMessage(instanceName, {
          number: lead.phone,
          text: recoveryMessage,
        });

        results.push({
          phone: lead.phone,
          success: true,
          message: recoveryMessage,
        });

        // Aguardar 2 segundos entre envios pra não parecer spam
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`[Recover Leads] Error sending to ${lead.phone}:`, error);
        results.push({
          phone: lead.phone,
          success: false,
          error: error.message || 'Erro ao enviar mensagem',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: leads.length,
        sent: successCount,
        failed: failCount,
      },
      results,
    });
  } catch (error: any) {
    console.error('[Recover Leads API] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao processar recuperação de leads' },
      { status: 500 }
    );
  }
}

async function generateRecoveryMessage(lead: RecoverLeadRequest): Promise<string> {
  try {
    const prompt = `Você é um assistente de vendas de imóveis. Gere uma mensagem natural e amigável para retomar contato com um lead que parou de responder.

Contexto:
- Nome: ${lead.contactName}
- Última mensagem: "${lead.lastMessage}"
${lead.intent ? `- Situação: ${lead.intent.summary}` : ''}
${lead.intent?.suggestedAction ? `- Ação sugerida: ${lead.intent.suggestedAction}` : ''}

Regras:
1. Mensagem curta (máximo 3 linhas)
2. Tom amigável e natural, não formal demais
3. Não parece spam ou automático
4. Mencione algo da última conversa se possível
5. Pergunte se ainda tem interesse no imóvel
6. NÃO use emojis excessivos (no máximo 1)
7. Escreva como um corretor de verdade escreveria no WhatsApp

Retorne APENAS a mensagem, sem aspas ou formatação extra.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const message = result.response.text().trim();

    return message;
  } catch (error) {
    console.error('[Generate Recovery Message] Error:', error);
    
    // Fallback: mensagem simples sem IA
    const firstName = lead.contactName.split(' ')[0];
    return `Oi ${firstName}! Como você está? Vi que conversamos sobre imóveis e queria saber se ainda tem interesse. Posso te ajudar com alguma informação?`;
  }
}
