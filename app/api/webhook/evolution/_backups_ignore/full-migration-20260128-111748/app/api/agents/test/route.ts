import { NextResponse } from 'next/server';
import { getAgentConfig } from '@/lib/agents/config';
import { detectIntent, type IntentResult } from '@/lib/sofia/intents';
import { analyzeSentiment } from '@/lib/sofia/sentiment';
import { AgentTestRequestSchema } from '@/lib/agents/schemas';
import type { AgentTestResponse } from '@/lib/agents/types';

// Response templates based on intent category
const CATEGORY_RESPONSES: Record<string, string> = {
  SAUDACAO: 'Olá! Como posso ajudá-lo hoje?',
  BUSCA_IMOVEL: 'Temos várias opções disponíveis! Posso ajudá-lo a encontrar o imóvel ideal.',
  SIMULACAO: 'Posso fazer uma simulação para você. Qual valor você está considerando?',
  TABELA_PRECO: 'Vou verificar os preços e condições disponíveis.',
  MATERIAL: 'Temos materiais informativos sobre nossos empreendimentos.',
  SUPORTE: 'Estou aqui para ajudar! Como posso auxiliá-lo?',
  FEEDBACK: 'Agradeço seu feedback! Sua opinião é muito importante.',
  META: 'Sou a assistente virtual da Pratica Incorporadora.',
  CONCORRENCIA: 'Posso explicar os diferenciais dos nossos empreendimentos.',
  OBJECAO: 'Entendo suas preocupações. Vamos analisar juntos.',
  AGENDA: 'Vou verificar os horários disponíveis para você.',
  CAMPANHA: 'Temos condições especiais! Posso mostrar as opções.',
  AJUDA_APP: 'Posso ajudá-lo a usar nosso aplicativo.',
  STATUS_PROCESSO: 'Vou verificar o status do seu processo.',
  COMISSAO: 'Posso ajudar com informações sobre comissões.',
  METAS: 'Vou verificar as metas e indicadores.',
  UNKNOWN: 'Desculpe, não entendi bem. Pode reformular sua pergunta?',
};

/**
 * POST /api/agents/test
 * Testa resposta do agente com uma mensagem simulada
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validar dados com Zod
    const parseResult = AgentTestRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { message, tenantId = 1, instanceName } = parseResult.data;

    // Buscar configuração do agente se instanceName fornecido
    let agentConfig = null;
    if (instanceName) {
      agentConfig = await getAgentConfig(tenantId, instanceName);
    }

    // Detectar intent
    let intentResult: IntentResult;
    try {
      intentResult = detectIntent(message);
    } catch {
      intentResult = {
        intent: 'unknown',
        category: 'UNKNOWN',
        confidence: 0,
        entities: {},
        triggers: [],
      };
    }

    // Analisar sentimento
    let sentimentResult: {
      sentiment: 'positive' | 'neutral' | 'negative' | 'urgent';
      score: number;
      frustrationLevel: number;
    } = {
      sentiment: 'neutral',
      score: 0.5,
      frustrationLevel: 3,
    };
    try {
      const sentiment = analyzeSentiment(message);
      sentimentResult = {
        sentiment: sentiment.sentiment,
        score: sentiment.confidence,
        frustrationLevel: sentiment.frustrationLevel,
      };
    } catch {
      // Mantém valores default
    }

    // Gerar resposta baseada na personalidade e categoria
    const personality = agentConfig?.personality || 'amigavel';
    const agentName = agentConfig?.agentName || 'Sofia';
    const baseResponse = CATEGORY_RESPONSES[intentResult.category] || CATEGORY_RESPONSES.UNKNOWN;

    // Adapt response based on personality
    let response = '';
    switch (personality) {
      case 'profissional':
        response = baseResponse
          .replace('Olá!', 'Prezado(a),')
          .replace('Vou verificar', 'Permitam-me verificar');
        break;
      case 'direto':
        response = baseResponse
          .replace('Olá! Como posso ajudá-lo hoje?', 'Como posso ajudar?')
          .replace('Temos várias opções disponíveis! Posso ajudá-lo a encontrar o imóvel ideal.', 'Posso mostrar opções.')
          .replace('Vou verificar os horários disponíveis para você.', 'Qual data prefere?');
        break;
      default: // amigavel
        response = baseResponse;
    }

    // Add agent signature for greeting
    if (intentResult.category === 'SAUDACAO') {
      response = `Olá! Sou ${agentName}. ` + response.replace('Olá! ', '');
    }

    // Aplicar limite de tamanho se configurado
    if (agentConfig?.maxMessageLength && response.length > agentConfig.maxMessageLength) {
      response = response.substring(0, agentConfig.maxMessageLength - 3) + '...';
    }

    const responseTimeMs = Date.now() - startTime;

    const result: AgentTestResponse = {
      success: true,
      response,
      analysis: {
        intentDetected: intentResult.intent,
        intentConfidence: intentResult.confidence,
        sentiment: sentimentResult.sentiment,
        frustrationLevel: sentimentResult.frustrationLevel,
        responseTimeMs,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error testing agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao processar teste do agente',
        response: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        analysis: {
          intentDetected: 'error',
          intentConfidence: 0,
          sentiment: 'neutro',
          frustrationLevel: 0,
          responseTimeMs: Date.now() - startTime,
        },
      },
      { status: 500 }
    );
  }
}
