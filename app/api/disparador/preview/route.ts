/**
 * API: Preview de Mensagens do Disparador
 *
 * POST /api/disparador/preview
 *
 * Gera 3 mensagens exemplo usando IA para preview antes do envio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import OpenAI from 'openai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
});

const PreviewSchema = z.object({
  tipo: z.enum(['follow_up', 'novidade', 'convite', 'livre']),
  intencao: z.string().min(5, 'Descreva sua intenção com pelo menos 5 caracteres'),
  leads: z.array(z.object({
    nome: z.string(),
    empreendimento: z.string().optional(),
  })).min(1).max(3),
});

const TIPO_LABELS: Record<string, string> = {
  follow_up: 'Follow-up de lead',
  novidade: 'Novidade ou lançamento',
  convite: 'Convite para evento ou visita',
  livre: 'Mensagem livre',
};

const TIPO_PROMPTS: Record<string, string> = {
  follow_up: `Você é um corretor imobiliário fazendo follow-up com um lead que demonstrou interesse.
Tom: cordial, não invasivo, relembrando o interesse anterior. Pergunte se ainda tem interesse.`,

  novidade: `Você é um corretor imobiliário compartilhando uma novidade ou oportunidade.
Tom: entusiasmado mas profissional, destacando benefícios concretos.`,

  convite: `Você é um corretor imobiliário convidando um lead para um evento ou visita.
Tom: pessoal, exclusivo, mostrando que o lead é especial.`,

  livre: `Você é um corretor imobiliário enviando uma mensagem personalizada.
Tom: adaptado ao contexto fornecido pelo corretor.`,
};

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const validation = PreviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { tipo, intencao, leads } = validation.data;

    if (!process.env.OPENAI_API_KEY) {
      // Fallback sem IA
      const mensagens = leads.map(lead => ({
        lead_nome: lead.nome,
        mensagem: `Olá, ${lead.nome.split(' ')[0]}! ${intencao}`,
      }));
      return NextResponse.json({ success: true, mensagens });
    }

    const prompt = `Gere mensagens de WhatsApp personalizadas para cada lead abaixo.

TIPO: ${TIPO_LABELS[tipo]}
INTENÇÃO DO CORRETOR: ${intencao}

LEADS:
${leads.map((l, i) => `${i + 1}. ${l.nome}${l.empreendimento ? ` (interesse: ${l.empreendimento})` : ''}`).join('\n')}

REGRAS:
1. Cada mensagem DEVE começar saudando pelo primeiro nome
2. Máximo 400 caracteres por mensagem
3. Use formatação WhatsApp: *negrito* para destaques
4. Emojis moderados e profissionais
5. Tom natural, como se fosse uma mensagem digitada manualmente
6. NUNCA mencione que é uma mensagem automatizada
7. Cada mensagem deve ser DIFERENTE das outras (varie saudação, estrutura, palavras)
8. Se o lead tem empreendimento de interesse, mencione-o naturalmente

Responda em JSON: { "mensagens": [{ "lead_nome": "Nome", "mensagem": "texto" }] }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: TIPO_PROMPTS[tipo] },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Erro ao gerar preview' }, { status: 500 });
    }

    const parsed = JSON.parse(content);

    return NextResponse.json({
      success: true,
      mensagens: parsed.mensagens || [],
    });
  } catch (error: any) {
    console.error('[Disparador Preview] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar preview' },
      { status: 500 }
    );
  }
}
