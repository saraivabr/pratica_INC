/**
 * API: Gerar Preview de Mensagem com IA
 *
 * POST /api/eventos/:id/gerar-mensagem
 * Gera preview de mensagem de convite para um convidado
 * usando IA para variacao anti-spam
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

// Schema de validacao
const GerarMensagemSchema = z.object({
  nome_convidado: z.string().min(1, 'Nome do convidado e obrigatorio'),
  usar_ia: z.boolean().optional().default(true),
});

interface EventoDB {
  id: string;
  workspace_id: number;
  nome: string;
  descricao: string | null;
  data_hora: string;
  local: string;
  status: string;
}

// Variacoes para gerar mensagens unicas
const SAUDACOES = ['Oi', 'Ola', 'E ai', 'Fala', 'Opa', 'Ei'];

const ABERTURAS = ['tudo bem?', 'tudo certo?', 'como vai?', 'beleza?', 'td bem?', ''];

const EMOJIS_SAUDACAO = ['', ' 👋', ' 😊', ' 🙂'];

const CONECTORES_CONVITE = [
  'Queria te convidar',
  'Te convido',
  'Passa la',
  'Vem comigo',
  'Marca na agenda',
  'Quero te ver',
];

const FINALIZACOES = [
  'Posso contar com sua presenca?',
  'Me confirma ai!',
  'Vai ser top, confirma pra mim!',
  'Pode confirmar?',
  'Bora? Me diz ai!',
  'Confirma se vai!',
  'Vai conseguir ir?',
];

/**
 * Formata data para exibicao variada
 */
function formatarDataVariada(dataHora: string): string {
  const data = new Date(dataHora);
  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  const hora = data.getHours().toString().padStart(2, '0');
  const minuto = data.getMinutes().toString().padStart(2, '0');

  const meses = [
    '',
    'janeiro',
    'fevereiro',
    'marco',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];

  const formatos = [
    `${dia}/${mes.toString().padStart(2, '0')} as ${hora}:${minuto}`,
    `dia ${dia} de ${meses[mes]} as ${hora}h${minuto !== '00' ? minuto : ''}`,
    `${dia}/${mes.toString().padStart(2, '0')}, ${hora}:${minuto}`,
    `no dia ${dia}/${mes.toString().padStart(2, '0')} as ${hora}h`,
  ];

  return formatos[Math.floor(Math.random() * formatos.length)];
}

/**
 * Gera mensagem unica para cada convidado (logica local)
 */
function gerarMensagemConviteLocal(
  nomeConvidado: string,
  evento: { nome: string; descricao: string | null; data_hora: string; local: string }
): string {
  const primeiroNome = nomeConvidado.split(' ')[0];

  const saudacao = SAUDACOES[Math.floor(Math.random() * SAUDACOES.length)];
  const abertura = ABERTURAS[Math.floor(Math.random() * ABERTURAS.length)];
  const emoji = EMOJIS_SAUDACAO[Math.floor(Math.random() * EMOJIS_SAUDACAO.length)];
  const conector = CONECTORES_CONVITE[Math.floor(Math.random() * CONECTORES_CONVITE.length)];
  const finalizacao = FINALIZACOES[Math.floor(Math.random() * FINALIZACOES.length)];
  const dataFormatada = formatarDataVariada(evento.data_hora);

  // Montar mensagem com variacao
  let mensagem = `${saudacao} ${primeiroNome}`;

  if (abertura) {
    mensagem += `, ${abertura}`;
  }
  mensagem += `${emoji}\n\n`;

  // Diferentes estruturas de convite
  const estruturas = [
    // Estrutura 1: Direto
    `${conector} pro *${evento.nome}*!\n\n📅 ${dataFormatada}\n📍 ${evento.local}`,
    // Estrutura 2: Data primeiro
    `${dataFormatada} vai rolar o *${evento.nome}*.\nLocal: ${evento.local}`,
    // Estrutura 3: Pergunta
    `Vai ter o *${evento.nome}* ${dataFormatada} em ${evento.local}. ${conector}!`,
    // Estrutura 4: Casual
    `${conector} no *${evento.nome}* ${dataFormatada}. Vai ser em ${evento.local}.`,
  ];

  mensagem += estruturas[Math.floor(Math.random() * estruturas.length)];

  // Adicionar descricao se houver (50% de chance)
  if (evento.descricao && Math.random() > 0.5) {
    mensagem += `\n\n${evento.descricao}`;
  }

  mensagem += `\n\n${finalizacao}`;

  return mensagem;
}

/**
 * Gera mensagem usando IA (OpenAI/Anthropic)
 */
async function gerarMensagemConviteIA(
  nomeConvidado: string,
  evento: { nome: string; descricao: string | null; data_hora: string; local: string }
): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  // Se nao tiver API key, usa geracao local
  if (!OPENAI_API_KEY) {
    return gerarMensagemConviteLocal(nomeConvidado, evento);
  }

  const data = new Date(evento.data_hora);
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const prompt = `Voce e Sofia, uma assistente de uma imobiliaria. Gere uma mensagem curta e informal de convite para WhatsApp.

Dados do evento:
- Nome: ${evento.nome}
- Data/Hora: ${dataFormatada}
- Local: ${evento.local}
${evento.descricao ? `- Descricao: ${evento.descricao}` : ''}

Convidado: ${nomeConvidado}

Instrucoes:
1. Use apenas o primeiro nome do convidado
2. Seja informal mas profissional
3. Varie saudacao (Oi, Ola, E ai, Fala, Opa)
4. Pode usar emojis com moderacao (maximo 2-3)
5. Termine pedindo confirmacao de forma natural
6. Maximo 200 caracteres
7. NAO use "Prezado(a)" ou linguagem muito formal
8. Destaque o nome do evento com *asteriscos*

Responda APENAS com a mensagem, sem explicacoes.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Voce e Sofia, assistente de imobiliaria. Gera mensagens de convite para WhatsApp de forma natural e variada.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.9, // Alta variacao
      }),
    });

    if (!response.ok) {
      console.error('Erro na API OpenAI:', response.status);
      return gerarMensagemConviteLocal(nomeConvidado, evento);
    }

    const result = await response.json();
    const mensagem = result.choices?.[0]?.message?.content?.trim();

    if (!mensagem) {
      return gerarMensagemConviteLocal(nomeConvidado, evento);
    }

    return mensagem;
  } catch (error) {
    console.error('Erro ao gerar mensagem com IA:', error);
    return gerarMensagemConviteLocal(nomeConvidado, evento);
  }
}

/**
 * POST /api/eventos/:id/gerar-mensagem
 * Gera preview de mensagem de convite
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id: eventoId } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventoId)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento invalido' },
        { status: 400 }
      );
    }

    // Validar body
    const body = await request.json();
    const validationResult = GerarMensagemSchema.safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        {
          success: false,
          error: firstError.message,
          field: firstError.path.join('.'),
        },
        { status: 400 }
      );
    }

    const { nome_convidado, usar_ia } = validationResult.data;

    // Buscar evento
    const eventoResult = await pool.query<EventoDB>(
      'SELECT * FROM eventos WHERE id = $1 AND workspace_id = $2',
      [eventoId, workspaceId]
    );

    if (eventoResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Evento nao encontrado' },
        { status: 404 }
      );
    }

    const evento = eventoResult.rows[0];

    // Gerar mensagem
    let mensagem: string;

    if (usar_ia) {
      mensagem = await gerarMensagemConviteIA(nome_convidado, evento);
    } else {
      mensagem = gerarMensagemConviteLocal(nome_convidado, evento);
    }

    // Gerar algumas variacoes adicionais para preview
    const variacoes: string[] = [mensagem];

    for (let i = 0; i < 2; i++) {
      const variacao = usar_ia
        ? await gerarMensagemConviteIA(nome_convidado, evento)
        : gerarMensagemConviteLocal(nome_convidado, evento);

      // Evitar duplicatas
      if (!variacoes.includes(variacao)) {
        variacoes.push(variacao);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        mensagem,
        variacoes,
        evento: {
          nome: evento.nome,
          data_hora: evento.data_hora,
          local: evento.local,
        },
        convidado: nome_convidado,
        gerado_com_ia: usar_ia && !!process.env.OPENAI_API_KEY,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar mensagem:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar mensagem' },
      { status: 500 }
    );
  }
}
