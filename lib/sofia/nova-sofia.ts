/**
 * Nova Sofia — Assistente CP reescrita do zero
 * 
 * IA conversacional natural, proativa, sem botões, sem menus.
 * Fala como humano no WhatsApp. Secretária solícita.
 */

import { dbQuery } from '@/lib/db';
import { sendTextMessage } from '@/lib/zapi';
import { normalizePhone } from '@/lib/supabase';
import { getCorretorContext, type CorretorContext } from './corretor-context';

// ============================================
// CONVERSATION MEMORY (Redis-backed, persistent)
// ============================================

import Redis from 'ioredis';

interface ConvoEntry {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

const MEMORY_TTL_SECONDS = 24 * 60 * 60; // 24 horas
const MAX_HISTORY = 20;
const REDIS_PREFIX = 'sofia:convo:';

let _redis: Redis | null = null;
function getRedisClient(): Redis {
  if (!_redis) {
    _redis = new Redis({ host: '127.0.0.1', port: 6379, maxRetriesPerRequest: 2 });
    _redis.on('error', (err) => console.error('[Nova Sofia Redis]', err.message));
  }
  return _redis;
}

async function getHistory(phone: string): Promise<ConvoEntry[]> {
  try {
    const redis = getRedisClient();
    const raw = await redis.get(REDIS_PREFIX + phone);
    if (!raw) return [];
    return JSON.parse(raw) as ConvoEntry[];
  } catch {
    return [];
  }
}

async function addToHistory(phone: string, role: 'user' | 'assistant', text: string) {
  try {
    const redis = getRedisClient();
    const entries = await getHistory(phone);
    entries.push({ role, text, ts: Date.now() });
    // Keep only last N
    if (entries.length > MAX_HISTORY) entries.splice(0, entries.length - MAX_HISTORY);
    await redis.set(REDIS_PREFIX + phone, JSON.stringify(entries), 'EX', MEMORY_TTL_SECONDS);
  } catch (err) {
    console.error('[Nova Sofia] Redis write error:', err);
  }
}

async function formatHistoryForPrompt(phone: string): Promise<string> {
  const entries = await getHistory(phone);
  if (entries.length === 0) return '';
  
  return '\n\nHISTÓRICO RECENTE DA CONVERSA:\n' + 
    entries.map(e => `${e.role === 'user' ? 'CORRETOR' : 'SOFIA'}: ${e.text}`).join('\n');
}

// ============================================
// UTILS
// ============================================

/** Converte "JOÃO DA SILVA" → "João da Silva" */
function titleCase(str: string): string {
  if (!str) return str;
  const lower = ['da', 'de', 'do', 'das', 'dos', 'e'];
  return str
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (i > 0 && lower.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// ============================================
// TYPES
// ============================================

interface SofiaUser {
  id: string;
  nome: string;
  telefone: string;
  role: string;
  cvcrm_id?: number;
  imobiliaria_id?: string;
  imobiliarias?: { nome: string };
}

// ============================================
// SYSTEM PROMPT
// ============================================

function buildSystemPrompt(user: SofiaUser, context: CorretorContext): string {
  const firstName = (user.nome || '').split(' ')[0] || 'parceiro';
  
  // Build context section
  let contextInfo = '';
  
  const totalLeads = context.leadSummary.reduce((sum, s) => sum + Number(s.total), 0);
  
  if (context.pendingLeads.length > 0) {
    const names = context.pendingLeads.map(l => titleCase(l.nome)).join(', ');
    contextInfo += `\nLEADS AGUARDANDO ATENDIMENTO (${context.pendingLeads.length}): ${names}`;
  }
  
  if (context.recentWins.length > 0) {
    const wins = context.recentWins.map(w => `${titleCase(w.nome)} (${w.situacao_nome})`).join(', ');
    contextInfo += `\nCONQUISTAS RECENTES: ${wins}`;
  }
  
  if (totalLeads > 0) {
    const summary = context.leadSummary.map(s => `${s.situacao_nome}: ${s.total}`).join(', ');
    contextInfo += `\nFUNIL COMPLETO (${totalLeads} leads): ${summary}`;
  }
  
  if (context.properties && context.properties.length > 0) {
    const propList = context.properties
      .filter(p => p.estoque > 0 && p.preco_minimo > 1)
      .map(p => `${p.nome}: ${p.estoque} unid. disponíveis, a partir de R$${Number(p.preco_minimo).toLocaleString('pt-BR')}${p.fase ? ` (${p.fase})` : ''}`)
      .join('\n');
    contextInfo += `\n\nEMPREENDIMENTOS COM ESTOQUE:\n${propList}`;
  } else {
    contextInfo += `\nEMPREENDIMENTOS ATIVOS: ${context.propertiesCount}`;
  }

  return `Você é a Sofia, assistente da Corretor Parceria (CP). Você ajuda corretores de imóveis no dia a dia.

QUEM VOCÊ TÁ FALANDO:
Nome: ${user.nome} (chame de ${firstName})
Cargo: ${user.role}
${user.imobiliarias?.nome ? `Imobiliária: ${user.imobiliarias.nome}` : ''}

DADOS ATUAIS DO CORRETOR:${contextInfo}

SUA PERSONALIDADE:
- Você é como uma secretária super solícita e atenciosa
- Fala casual, como amiga no WhatsApp
- É PROATIVA: não espera pergunta, já traz informação útil
- Quando o corretor diz "oi", você já atualiza ele sobre pendências, leads, novidades
- Você CONHECE o corretor, sabe os leads dele, sabe o que tá rolando
- Comemora conquistas (reservas, vendas)
- Alerta sobre leads que precisam de atenção

COMO VOCÊ ESCREVE:
- Cada assunto é uma MENSAGEM SEPARADA. Separe por \n\n (linha em branco)
- Cada mensagem tem no MÁXIMO 2-3 linhas
- Negrito com *um asterisco só*
- Sem bullet points, sem listas numeradas, sem headers
- Máximo 1 emoji por mensagem, e nem toda mensagem precisa
- NUNCA use formato de documento ou relatório
- NUNCA mande tudo de uma vez — quebre em pedaços curtos
- Escreva em letra minúscula quando casual (como gente no zap)

EXEMPLO DE COMO VOCÊ FALA:
"oi ${firstName}! tudo bem?

vi que a *Lorena* fechou reserva, parabéns! show demais 🎉

tem 3 leads esperando seu retorno — Alessandra, Sandra e Sergio. quer que eu puxe o contato deles?"

Cada parágrafo acima vira uma mensagem separada no WhatsApp. Mantenha CURTO.

O QUE VOCÊ PODE FAZER:
- Informar sobre leads do corretor (status, pendências, histórico)
- Puxar info de empreendimentos (espelho, tabela de preço, fotos)
- Ajudar com simulações
- Agendar visitas
- Dar suporte geral sobre a plataforma CP
- Qualquer coisa que um corretor imobiliário precise no dia a dia

REGRAS:
- NUNCA mande botões, menus ou listas estruturadas
- NUNCA fale "como posso ajudá-lo?" ou "estou à disposição" — isso é coisa de robô
- Se não sabe algo, fala "vou verificar" em vez de inventar
- Use APENAS os dados fornecidos no contexto. Não invente leads ou números
- Se o contexto está vazio, diga que não encontrou dados no momento
- NUNCA repita informação que já disse na conversa. Olhe o HISTÓRICO.
- Se o corretor responde "tá", "sim", "ok", "blz" → ele confirmou. Prossiga naturalmente, NÃO recomeçe do zero.
- Na PRIMEIRA mensagem da conversa, traga contexto (leads, vendas). Nas PRÓXIMAS, responda ao que ele disse.
- Se já cumprimentou, NÃO cumprimente de novo. Vai direto ao ponto.`;
}

// ============================================
// AI CALL
// ============================================

async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  // Try Gemini 2.0 Flash first (free)
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (apiKey) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\nMENSAGEM DO CORRETOR: "${userMessage}"\n\nResponda como Sofia:` }]
            }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 512,
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          console.log('[Nova Sofia] Gemini response OK');
          return text;
        }
      }
    }
  } catch (err) {
    console.error('[Nova Sofia] Gemini failed:', err);
  }

  // Fallback: GPT-4o-mini
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.8,
          max_tokens: 512,
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) {
          console.log('[Nova Sofia] GPT-4o-mini response OK');
          return text;
        }
      }
    }
  } catch (err) {
    console.error('[Nova Sofia] OpenAI failed:', err);
  }

  return 'oi! desculpa, tive um probleminha técnico aqui. tenta de novo em alguns segundos? 😅';
}

// ============================================
// MESSAGE SPLITTING — manda como humano
// ============================================

/**
 * Divide resposta da IA em mensagens separadas.
 * Usa \n\n como separador (parágrafos).
 * Cada pedaço vira uma mensagem separada com delay.
 */
function splitIntoMessages(text: string): string[] {
  // Split por dupla quebra de linha (parágrafos)
  const parts = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Se ficou só 1 parte mas é grande, tenta split por \n
  if (parts.length === 1 && parts[0].length > 300) {
    const lines = parts[0]
      .split(/\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    // Agrupa linhas em chunks de ~200 chars
    const chunks: string[] = [];
    let current = '';
    for (const line of lines) {
      if (current && (current.length + line.length) > 200) {
        chunks.push(current.trim());
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks.length > 1 ? chunks : parts;
  }

  return parts;
}

/**
 * Delay entre mensagens — simula digitação
 * ~50ms por char, min 800ms, max 3000ms
 */
function typingDelay(text: string): number {
  const ms = Math.min(3000, Math.max(800, text.length * 50));
  return ms;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// MAIN PROCESSOR
// ============================================

/**
 * Processa mensagem de um corretor/admin/gerente via Nova Sofia
 */
export async function processNovaSofia(
  phone: string,
  messageText: string,
  user: SofiaUser
): Promise<void> {
  const normalizedPhone = normalizePhone(phone);
  
  console.log(`[Nova Sofia] Processing: ${user.nome} (${user.role}) -> "${messageText}"`);

  try {
    // 1. Fetch corretor context
    const context = await getCorretorContext(
      user.cvcrm_id?.toString() || user.id,
      user.nome,
      user.role
    );
    console.log(`[Nova Sofia] Context: ${context.pendingLeads.length} pending, ${context.recentWins.length} wins, ${context.propertiesCount} properties`);

    // 2. Save user message to history
    await addToHistory(normalizedPhone, 'user', messageText);

    // 3. Build system prompt with context + history
    const history = await formatHistoryForPrompt(normalizedPhone);
    const systemPrompt = buildSystemPrompt(user, context) + history;

    // 4. Call AI
    const response = await callAI(systemPrompt, messageText);

    // 4. Split response into human-like messages
    const messages = splitIntoMessages(response);
    console.log(`[Nova Sofia] Sending ${messages.length} messages to ${normalizedPhone}`);

    // 5. Save AI response to history
    await addToHistory(normalizedPhone, 'assistant', response);

    // 6. Send each message with typing delay
    for (let i = 0; i < messages.length; i++) {
      if (i > 0) {
        await delay(typingDelay(messages[i]));
      }
      await sendTextMessage(normalizedPhone, messages[i]);
    }

    console.log(`[Nova Sofia] All messages sent`);

  } catch (error) {
    console.error('[Nova Sofia] Error:', error);
    await sendTextMessage(normalizedPhone, 'oi, tive um probleminha aqui. tenta de novo? 😅');
  }
}
