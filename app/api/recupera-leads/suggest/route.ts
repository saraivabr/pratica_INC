import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Fallback to OpenAI if needed
const openaiApiKey = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
    try {
        // Autenticação e contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const { workspaceId, user } = ctx;
        const { lead_id } = await request.json();

        if (!lead_id) {
            return NextResponse.json(
                { error: 'lead_id é obrigatório' },
                { status: 400 }
            );
        }

        // Buscar dados do lead e histórico de conversas
        const leadQuery = `
            SELECT 
                l.nome,
                l.telefone,
                l.email,
                l.situacao_nome,
                l.origem,
                l.empreendimento,
                l.data_cadastro_cvcrm as data_cadastro,
                l.corretor_nome
            FROM cvcrm_leads l
            WHERE l.id = $1 AND l.workspace_id = $2
        `;

        // Buscar histórico de mensagens WhatsApp
        const conversationQuery = `
            SELECT 
                message_text as content,
                is_from_me,
                timestamp,
                message_type
            FROM whatsapp_messages
            WHERE REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g') = REGEXP_REPLACE($1, '[^0-9]', '', 'g')
                AND workspace_id = $2
                AND message_text IS NOT NULL
                AND message_text != ''
            ORDER BY timestamp DESC
            LIMIT 10
        `;

        const [leadResult, conversationResult] = await Promise.all([
            pool.query(leadQuery, [lead_id, workspaceId]),
            pool.query(conversationQuery, [leadResult?.rows?.[0]?.telefone || '', workspaceId])
        ]);

        if (leadResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Lead não encontrado' },
                { status: 404 }
            );
        }

        const lead = leadResult.rows[0];
        const messages = conversationResult.rows;

        // Preparar contexto para a IA
        const empreendimento = lead.empreendimento && typeof lead.empreendimento === 'string' 
            ? JSON.parse(lead.empreendimento) 
            : lead.empreendimento;

        const conversationHistory = messages.map(msg => 
            `${msg.is_from_me ? 'Corretor' : 'Cliente'}: ${msg.content}`
        ).join('\n');

        // Prompt para a IA
        const prompt = `
Você é um corretor de imóveis experiente e precisa criar uma mensagem personalizada de WhatsApp para reativar um lead que está há alguns dias sem responder.

INFORMAÇÕES DO LEAD:
- Nome: ${lead.nome}
- Situação: ${lead.situacao_nome || 'Não definida'}
- Origem: ${lead.origem || 'Não informada'}
- Empreendimento interessado: ${empreendimento?.[0]?.nome || empreendimento?.nome || 'Não especificado'}
- Corretor responsável: ${lead.corretor_nome}
- Data de cadastro: ${lead.data_cadastro ? new Date(lead.data_cadastro).toLocaleDateString('pt-BR') : 'Não informada'}

HISTÓRICO DE CONVERSA (mais recentes primeiro):
${conversationHistory || 'Nenhuma conversa anterior no WhatsApp'}

INSTRUÇÕES:
1. Crie uma mensagem amigável e personalizada em português brasileiro
2. Use o nome do lead na saudação
3. Seja natural, como se fosse um corretor experiente escrevendo
4. Mencione o empreendimento se relevante
5. Crie urgência positiva (oportunidades, lançamentos, condições especiais)
6. Use formatação WhatsApp: *negrito* para destaques importantes
7. Máximo 200 palavras
8. Inclua uma pergunta ou call-to-action claro
9. Evite ser insistente ou desesperado
10. Se houver histórico, referencie sutilmente a conversa anterior

FORMATO WHATSAPP:
- Use *asterisco simples* para negrito
- Não use # (headers não funcionam)
- Não use bullet points markdown
- Escreva de forma natural e conversacional

Gere APENAS a mensagem, sem explicações adicionais.
`;

        let suggestion = '';

        try {
            // Tentar usar Gemini 2.0 Flash primeiro
            const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
            
            if (geminiApiKey) {
                const genAI = new GoogleGenerativeAI(geminiApiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

                const result = await model.generateContent(prompt);
                const response = await result.response;
                suggestion = response.text();
            } else if (openaiApiKey) {
                // Fallback para OpenAI GPT-4o-mini
                const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openaiApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: 'Você é um corretor de imóveis experiente que cria mensagens personalizadas de WhatsApp para reativar leads.'
                            },
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        max_tokens: 500,
                        temperature: 0.7
                    })
                });

                if (!openaiResponse.ok) {
                    throw new Error(`OpenAI API error: ${openaiResponse.status}`);
                }

                const openaiData = await openaiResponse.json();
                suggestion = openaiData.choices?.[0]?.message?.content || '';
            } else {
                throw new Error('Nenhuma API de IA configurada');
            }

            // Limpar e formatar a sugestão
            suggestion = suggestion.trim();

            // Garantir formatação WhatsApp correta
            suggestion = suggestion
                .replace(/\*\*(.*?)\*\*/g, '*$1*') // Converter **texto** para *texto*
                .replace(/#{1,6}\s*/g, '') // Remover headers
                .replace(/^\s*[-*+]\s+/gm, '') // Remover bullet points
                .trim();

            if (!suggestion) {
                throw new Error('Resposta vazia da IA');
            }

            return NextResponse.json({
                suggestion,
                lead_name: lead.nome,
                model_used: geminiApiKey ? 'gemini-2.0-flash' : 'gpt-4o-mini'
            });

        } catch (aiError) {
            console.error('Erro na IA:', aiError);
            
            // Fallback para mensagem template se a IA falhar
            const fallbackMessage = `Oi *${lead.nome}*! 😊

Espero que esteja tudo bem com você! 

Estive pensando sobre ${empreendimento?.[0]?.nome || empreendimento?.nome || 'as oportunidades'} que conversamos e gostaria de compartilhar algumas novidades interessantes.

${messages.length > 0 ? 'Como você havia demonstrado interesse, ' : ''}tenho algumas condições especiais que podem ser perfeitas para o seu perfil.

*Que tal conversarmos hoje?* Posso te mostrar algumas opções que chegaram e acho que você vai gostar! 

Quando você teria uns minutinhos para conversarmos?`;

            return NextResponse.json({
                suggestion: fallbackMessage,
                lead_name: lead.nome,
                model_used: 'fallback-template',
                warning: 'IA indisponível, usando template personalizado'
            });
        }

    } catch (error) {
        console.error('Erro ao gerar sugestão:', error);
        return NextResponse.json(
            { 
                error: 'Erro ao gerar sugestão de mensagem',
                details: String(error)
            },
            { status: 500 }
        );
    }
}