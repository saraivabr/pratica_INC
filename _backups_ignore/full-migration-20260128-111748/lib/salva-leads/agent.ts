/**
 * Salva Leads - Agente Conversacional Luna
 *
 * Agente que continua conversas com leads inativos
 * usando OpenAI com function calling e inteligência psicológica
 */

import OpenAI from 'openai';
import { SalvaLeadsConversation, SalvaLeadsToolDefinition } from './types';
import { SALVA_LEADS_TOOLS } from './tools';
import { analyzePsychology, quickAnalyzePsychology } from '../sofia/langchain/psychology-analyzer';
import { detectObjectionType, getObjectionReframe } from '../sofia/psychology/objection-reframes';
import { buildLunaSystemPrompt, generateReactivationOpener } from './persona';
import { getConversationHistoryForAI } from './conversation';
import type { PsychologicalAnalysis } from '../sofia/psychology/types';

// Lazy initialization to avoid build-time errors
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

/**
 * Processa mensagem do lead com o agente Luna (IA com psicologia)
 *
 * ARQUITETURA DE HISTÓRICO:
 * - Usa Redis como cache primário para histórico (rápido)
 * - Fallback para PostgreSQL se Redis não estiver disponível
 * - Histórico formatado otimizado para o prompt da IA
 */
export async function processWithAgent(
  conversation: SalvaLeadsConversation,
  newMessage: string,
  tenantId: number
): Promise<string> {
  const context = conversation.context || {};

  // 1. Quick psychology analysis
  let psychology: PsychologicalAnalysis | undefined;
  try {
    psychology = await analyzePsychology(
      newMessage,
      conversation.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')
    );
  } catch (error) {
    console.warn('[Luna] Psychology analysis failed, using heuristics:', error);
    psychology = quickAnalyzePsychology(newMessage);
  }

  // 2. Check for objections
  const objectionType = detectObjectionType(newMessage);
  let objectionContext = '';
  if (objectionType) {
    const reframe = getObjectionReframe(objectionType, newMessage);
    if (reframe) {
      objectionContext = `
OBJEÇÃO DETECTADA: ${objectionType}
Medo subjacente: ${reframe.underlyingFear}
Abordagem recomendada: ${reframe.approach}
Sugestão de resposta empática: ${reframe.response}
`;
    }
  }

  // 3. Get optimized conversation history (Redis-first with PostgreSQL fallback)
  const conversationHistory = await getConversationHistoryForAI(
    tenantId,
    conversation.lead_phone,
    conversation.id,
    2000 // max chars
  );

  // 4. Build Luna's system prompt with psychology
  const systemPrompt = buildLunaSystemPrompt({
    corretorNome: context.corretorNome || 'Corretor',
    imobiliariaNome: context.imobiliariaNome,
    leadNome: conversation.lead_name || undefined,
    interesse: context.interesse,
    psychology,
    conversationHistory: conversationHistory || conversation.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n'),
    isReactivation: context.isReactivation || false,
    diasInativo: context.diasInativo,
  });

  // 5. Build messages for OpenAI
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt + objectionContext },
    ...conversation.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })),
    { role: 'user', content: newMessage }
  ];

  // 6. Define tools for OpenAI
  const tools = SALVA_LEADS_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));

  // 7. Call OpenAI
  const requestParams: any = {
    model: process.env.OPENAI_SALVA_LEADS_MODEL || 'gpt-4o-mini',
    messages,
    max_tokens: 200, // Increased for more natural responses
    temperature: 0.8 // Slightly higher for more human-like responses
  };

  if (tools.length > 0) {
    requestParams.tools = tools;
    requestParams.tool_choice = 'auto';
  }

  const response = await getOpenAI().chat.completions.create(requestParams);
  const assistantMessage = response.choices[0].message;

  // 8. Handle tool calls if any (parallel execution)
  const toolCalls = (assistantMessage as any).tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    const toolResultsPromises = await Promise.all(
      toolCalls.map(async (toolCall: any) => {
        const fnName = toolCall.function?.name;
        const fnArgs = toolCall.function?.arguments;
        const tool = SALVA_LEADS_TOOLS.find(t => t.name === fnName);

        if (tool && fnArgs) {
          try {
            const args = JSON.parse(fnArgs);
            const result = await tool.execute(args, conversation, tenantId);
            return {
              tool_call_id: toolCall.id,
              role: 'tool' as const,
              content: JSON.stringify(result)
            };
          } catch (error) {
            console.error(`Erro ao executar tool ${fnName}:`, error);
            return {
              tool_call_id: toolCall.id,
              role: 'tool' as const,
              content: JSON.stringify({ error: 'Erro ao executar ferramenta' })
            };
          }
        }
        return null;
      })
    );

    // Filter out null results (tools not found)
    const toolResults = toolResultsPromises.filter(
      (result): result is { tool_call_id: string; role: 'tool'; content: string } => result !== null
    );

    // Follow-up call with tool results
    const followUpMessages = [
      ...messages,
      assistantMessage as any,
      ...toolResults
    ];

    const followUp = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_SALVA_LEADS_MODEL || 'gpt-4o-mini',
      messages: followUpMessages,
      max_tokens: 200,
      temperature: 0.8
    });

    return followUp.choices[0].message.content || '';
  }

  return assistantMessage.content || '';
}

/**
 * Classifica a conversa baseado no historico
 */
export async function classifyConversation(
  conversation: SalvaLeadsConversation
): Promise<'tem_potencial' | 'encerrada'> {
  const response = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_SALVA_LEADS_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Analise a conversa e classifique: "tem_potencial" se o lead demonstrou interesse, "encerrada" se nao ha mais potencial. Responda apenas com uma palavra.'
      },
      {
        role: 'user',
        content: JSON.stringify(conversation.messages)
      }
    ],
    max_tokens: 10,
    temperature: 0.2
  });

  const result = response.choices[0].message.content?.toLowerCase() || '';
  return result.includes('potencial') ? 'tem_potencial' : 'encerrada';
}

/**
 * Gera mensagem inicial de recuperação usando Luna com psicologia
 */
export async function generateInitialRecoveryMessage(
  conversation: SalvaLeadsConversation,
  tenantId: number
): Promise<string> {
  const context = conversation.context || {};

  // Try to get psychology from last interaction if available
  let psychology: PsychologicalAnalysis | undefined;
  const lastUserMessage = conversation.messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    try {
      psychology = await analyzePsychology(lastUserMessage.content);
    } catch (error) {
      console.warn('[Luna] Could not analyze psychology for reactivation');
    }
  }

  // Generate opener using Luna's reactivation strategies
  return generateReactivationOpener({
    leadNome: conversation.lead_name || '',
    corretorNome: context.corretorNome || 'Corretor',
    diasInativo: context.diasInativo || 7,
    interesse: context.interesse,
    psychology,
  });
}
