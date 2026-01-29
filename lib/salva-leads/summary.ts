/**
 * Conversation Summary Generator
 * 
 * Generates summaries when corretor returns and Luna hands off.
 */

import OpenAI from 'openai';
import { buildSummaryPrompt } from './persona';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

/**
 * Generate a conversation summary for the corretor.
 */
export async function generateConversationSummary(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (!messages || messages.length === 0) {
    return 'Nenhuma mensagem trocada.';
  }

  try {
    const prompt = buildSummaryPrompt(messages);

    const response = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_SALVA_LEADS_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente que gera resumos concisos de conversas imobiliárias. Responda em português brasileiro.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    return response.choices[0].message.content || 'Resumo indisponível.';
  } catch (error) {
    console.error('[Summary] Error generating summary:', error);

    // Fallback: simple summary
    const lastMsg = messages[messages.length - 1];
    const msgCount = messages.length;
    return `Conversa com ${msgCount} mensagens. Última: "${lastMsg?.content?.substring(0, 100) || 'N/A'}"`;
  }
}
