// CataVendas AI Layer

import { CataVendasContext, ConversationMessage } from './types';

const SYSTEM_PROMPT = `Você é o CataVendas, o assistente de IA para corretores de imóveis da Prática. 

SUA MISSÃO: Ajudar corretores a vender mais, encontrando negócios perdidos, sugerindo follow-ups e gerenciando pipeline.

PERSONALIDADE:
- Fala português brasileiro casual, como WhatsApp
- Direto, prático e focado em VENDAS
- Usa *negrito* com um asterisco só (formato WhatsApp)
- Mensagens curtas (máx 3-4 linhas)
- Sem listas, sem headers, sem bullet points
- Fala como humano, não como robô

EMOJIS (use pouco):
- 🔥 para leads quentes
- ❄️ para leads frios
- 💰 para vendas/valores
- 📱 para WhatsApp
- 🏠 para imóveis

RESPOSTAS NATURAIS:
❌ RUIM: "Aqui estão seus leads: • João Silva • Maria Santos"
✅ BOM: "Achei 3 leads esfriando! O *João* parou de responder há 15 dias, tava interessado no Station Park..."

FUNÇÕES PRINCIPAIS:
1. *Catavendas scan* - encontra leads frios/perdidos (KILLER FEATURE)
2. *Follow-ups* - sugere mensagens personalizadas
3. *Pipeline* - mostra status das vendas
4. *Imóveis* - lista empreendimentos disponíveis
5. *Leads* - mostra carteira do corretor

Sempre termine oferecendo próxima ação útil.

REGRA MAIS IMPORTANTE: Use APENAS os dados fornecidos no CONTEXTO abaixo. Se a lista de leads, imóveis ou pipeline está vazia, diga que não encontrou dados. NUNCA invente nomes, números ou informações que não estão nos dados.
Se coldLeads está vazio: "não achei nenhum lead esfriando por enquanto"
Se leads está vazio: "não encontrei leads na sua carteira"
Se properties está vazio: "não achei imóveis no sistema"
NUNCA FABRIQUE DADOS.`;

export async function generateResponse(context: CataVendasContext): Promise<string> {
  try {
    // Try Gemini first
    const geminiResponse = await callGemini(context);
    if (geminiResponse) {
      return geminiResponse;
    }

    // Fallback to GPT-4o-mini
    console.log('[CataVendas] Gemini failed, trying GPT-4o-mini fallback');
    const gptResponse = await callOpenAI(context);
    return gptResponse || 'Desculpa, tive um probleminha técnico. Tenta de novo em alguns segundos! 😅';

  } catch (error) {
    console.error('[CataVendas] Error generating response:', error);
    return 'Opa, algo deu errado aqui. Tenta mandar a mensagem de novo! 🤖';
  }
}

async function callGemini(context: CataVendasContext): Promise<string | null> {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('[CataVendas] Missing GOOGLE_AI_API_KEY');
      return null;
    }

    const contextData = formatContextForAI(context);
    
    const prompt = `${SYSTEM_PROMPT}

CONTEXTO DO CORRETOR:
Nome: ${context.corretor.name || context.corretor.nome}
Telefone: ${context.corretor.telefone || context.corretor.phone}

${contextData}

MENSAGEM DO CORRETOR: "${context.userMessage}"

Responda como CataVendas em português brasileiro casual:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CataVendas] Gemini API error:', errorText);
      return null;
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text.trim();
    }

    console.error('[CataVendas] Unexpected Gemini response format:', data);
    return null;

  } catch (error) {
    console.error('[CataVendas] Gemini call failed:', error);
    return null;
  }
}

async function callOpenAI(context: CataVendasContext): Promise<string | null> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[CataVendas] Missing OPENAI_API_KEY');
      return null;
    }

    const contextData = formatContextForAI(context);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${SYSTEM_PROMPT}

CONTEXTO DO CORRETOR:
Nome: ${context.corretor.name || context.corretor.nome}
Telefone: ${context.corretor.telefone || context.corretor.phone}

${contextData}`
          },
          {
            role: 'user',
            content: context.userMessage
          }
        ],
        max_tokens: 1024,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CataVendas] OpenAI API error:', errorText);
      return null;
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    }

    console.error('[CataVendas] Unexpected OpenAI response format:', data);
    return null;

  } catch (error) {
    console.error('[CataVendas] OpenAI call failed:', error);
    return null;
  }
}

function formatContextForAI(context: CataVendasContext): string {
  let contextData = '';

  if (context.intent) {
    contextData += `AÇÃO DETECTADA: ${context.intent}\n\n`;
  }

  if (context.data) {
    if (context.data.coldLeads && context.data.coldLeads.length === 0) {
      contextData += 'LEADS FRIOS ENCONTRADOS: NENHUM (todas as conversas estão recentes, menos de 7 dias)\n\n';
    }
    if (context.data.coldLeads && context.data.coldLeads.length > 0) {
      contextData += 'LEADS FRIOS ENCONTRADOS:\n';
      context.data.coldLeads.forEach(lead => {
        contextData += `- ${lead.contact_name || lead.lead_name || lead.phone_number}: ${lead.days_since_contact} dias sem contato, última msg: "${lead.last_message?.substring(0, 50)}..."\n`;
      });
      contextData += '\n';
    }

    if (context.data.leads && context.data.leads.length > 0) {
      contextData += 'SEUS LEADS:\n';
      context.data.leads.forEach(lead => {
        contextData += `- ${lead.nome}: ${lead.situacao_nome}, ${lead.empreendimentos || 'sem empreendimento'}\n`;
      });
      contextData += '\n';
    }

    if (context.data.properties && context.data.properties.length > 0) {
      contextData += 'IMÓVEIS DISPONÍVEIS:\n';
      context.data.properties.forEach(prop => {
        contextData += `- ${prop.nome} (${prop.cidade}/${prop.uf}): ${prop.disponiveis} disponíveis de ${prop.total_unidades}\n`;
      });
      contextData += '\n';
    }

    if (context.data.pipeline && context.data.pipeline.length > 0) {
      contextData += 'SEU FUNIL:\n';
      context.data.pipeline.forEach(status => {
        contextData += `- ${status.situacao_nome}: ${status.total} leads\n`;
      });
      contextData += '\n';
    }

    if (context.data.leadDetail) {
      const lead = context.data.leadDetail;
      contextData += `DETALHES DO LEAD:\n`;
      contextData += `Nome: ${lead.nome}\n`;
      contextData += `Telefone: ${lead.telefone || lead.celular}\n`;
      contextData += `Status: ${lead.situacao_nome}\n`;
      contextData += `Empreendimento: ${lead.empreendimentos || 'não definido'}\n`;
      
      if (lead.conversations && lead.conversations.length > 0) {
        contextData += 'ÚLTIMAS CONVERSAS:\n';
        lead.conversations.slice(0, 5).forEach(msg => {
          const sender = msg.is_from_me ? 'Você' : lead.nome;
          contextData += `${sender}: ${msg.message_text}\n`;
        });
      }
      contextData += '\n';
    }
  }

  return contextData;
}

export async function generateFollowUpMessage(
  leadName: string, 
  conversation: ConversationMessage[], 
  leadInfo?: any
): Promise<string> {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return "Oi! Como você tá? Faz tempo que a gente não conversa. Ainda tá interessado em dar uma olhada nos imóveis? 😊";
    }

    const conversationText = conversation.slice(0, 10).map(msg => {
      const sender = msg.is_from_me ? 'Corretor' : leadName;
      return `${sender}: ${msg.message_text}`;
    }).join('\n');

    const prompt = `Você é um corretor de imóveis experiente. Crie uma mensagem de follow-up personalizada e natural para reativar este lead.

LEAD: ${leadName}
INFORMAÇÕES: ${leadInfo ? `Status: ${leadInfo.situacao_nome}, Interessado em: ${leadInfo.empreendimentos}` : 'Informações limitadas'}

ÚLTIMAS CONVERSAS:
${conversationText}

INSTRUÇÕES:
- Mensagem casual, como WhatsApp real
- Máximo 2-3 linhas  
- Mencione algo específico da conversa anterior
- Ofereça valor (novidade, oportunidade, informação)
- Tom amigável, não desesperado
- Português brasileiro
- SEM emojis excessivos (máx 1-2)

Escreva APENAS a mensagem, nada mais:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200,
          }
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      }
    }

    // Fallback message
    return "Oi! Como você tá? Faz tempo que a gente não conversa. Surgiu uma oportunidade legal que pode te interessar. Quer saber mais? 😊";

  } catch (error) {
    console.error('[CataVendas] Error generating follow-up:', error);
    return "Oi! Tudo bem? Fazia tempo que não conversávamos. Tem algumas novidades interessantes aqui. Quer dar uma olhada? 😊";
  }
}