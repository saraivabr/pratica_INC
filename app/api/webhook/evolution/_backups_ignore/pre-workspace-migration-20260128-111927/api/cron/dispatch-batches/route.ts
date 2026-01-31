/**
 * Cron: Processar Batches de Disparo de Eventos
 *
 * GET/POST /api/cron/dispatch-batches
 *
 * Processa batches pendentes de disparo de convites de eventos.
 * Deve ser executado a cada 30 segundos para processar batches em tempo razoável.
 *
 * Configuração:
 * - BATCH_SIZE: 50 convidados por execução
 * - DELAY_BETWEEN_MESSAGES: 2 segundos entre envios
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendTextMessage, formatPhoneNumber, isInstanceConnected } from '@/lib/evolution-api';
import { tenantQuery } from '@/lib/tenant-context';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos max (delays humanizados são longos)

// Configurações
const BATCH_SIZE = 20; // Convidados por execução (menor para parecer humano)

// Delays humanizados (em ms)
const DELAYS = {
  MIN_BETWEEN_MESSAGES: 8000,    // 8 segundos mínimo entre mensagens
  MAX_BETWEEN_MESSAGES: 25000,   // 25 segundos máximo entre mensagens
  TYPING_PER_CHAR: 50,           // 50ms por caractere (simula digitação)
  PAUSE_EVERY_N_MESSAGES: 5,     // Pausa maior a cada N mensagens
  PAUSE_MIN: 30000,              // Pausa mínima de 30s
  PAUSE_MAX: 90000,              // Pausa máxima de 1m30s
  THINKING_MIN: 2000,            // "Pensando" antes de enviar - mín 2s
  THINKING_MAX: 5000,            // "Pensando" antes de enviar - máx 5s
};


interface BatchDB {
  id: string;
  evento_id: string;
  tenant_id: number;
  instance_name: string;
  total_count: number;
  processed_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  error_log: any[];
}

interface EventoDB {
  id: string;
  nome: string;
  descricao: string | null;
  data_hora: string;
  local: string;
}

interface ConvidadoDB {
  id: string;
  nome: string;
  celular: string;
}

/**
 * Valida autenticação do cron
 */
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const xCronSecret = request.headers.get('x-cron-secret');
  if (xCronSecret === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Formata data de forma profissional
 */
function formatarData(dataHora: string): { data: string; hora: string; diaSemana: string; dataCompleta: string } {
  const d = new Date(dataHora);
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const ano = d.getFullYear();
  const hora = d.getHours().toString().padStart(2, '0');
  const minuto = d.getMinutes().toString().padStart(2, '0');

  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  return {
    data: `${dia}/${mes}`,
    hora: `${hora}:${minuto}`,
    diaSemana: diasSemana[d.getDay()],
    dataCompleta: `${dia} de ${meses[d.getMonth()]} de ${ano}`,
  };
}

/**
 * Gera mensagem de convite usando IA (OpenAI)
 */
async function gerarMensagemConviteIA(
  nomeConvidado: string,
  evento: { nome: string; descricao: string | null; data_hora: string; local: string }
): Promise<string> {
  const primeiroNome = nomeConvidado.split(' ')[0];
  const { data, hora, diaSemana, dataCompleta } = formatarData(evento.data_hora);

  const prompt = `Gere uma mensagem de convite para WhatsApp para um evento imobiliário.

DADOS DO EVENTO:
- Nome do evento: ${evento.nome}
- Data: ${diaSemana}, ${dataCompleta}
- Horário: ${hora}
- Local: ${evento.local}
${evento.descricao ? `- Descrição: ${evento.descricao}` : ''}

DADOS DO CONVIDADO:
- Nome: ${primeiroNome}

REGRAS OBRIGATÓRIAS:
1. Comece saudando o convidado pelo NOME (${primeiroNome})
2. Use formatação WhatsApp: *negrito* para destacar o nome do evento
3. Use emojis de forma moderada e profissional (📅 🕐 📍 📌)
4. Máximo 400 caracteres
5. Termine pedindo confirmação de presença de forma educada
6. Tom profissional mas cordial - é um convite de uma incorporadora imobiliária
7. NÃO use gírias ou linguagem muito informal
8. Estruture bem a mensagem com quebras de linha para fácil leitura
9. Inclua todas as informações essenciais: nome do evento, data, hora e local

Gere APENAS a mensagem, sem explicações ou comentários.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em criar mensagens profissionais de convite para eventos do mercado imobiliário. Suas mensagens são elegantes, bem estruturadas, cordiais e objetivas. Você sempre inclui o nome do convidado na saudação.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 250,
    });

    const mensagem = completion.choices[0]?.message?.content?.trim();
    if (mensagem) {
      console.log(`[Dispatch] Mensagem gerada com IA para ${primeiroNome}`);
      return mensagem;
    }
  } catch (error) {
    console.error('[Dispatch] Erro ao gerar mensagem com IA:', error);
  }

  // Fallback para template estático se IA falhar
  return gerarMensagemFallback(primeiroNome, evento, data, hora, diaSemana);
}

/**
 * Fallback: Mensagem estática caso a IA falhe
 */
function gerarMensagemFallback(
  primeiroNome: string,
  evento: { nome: string; descricao: string | null; local: string },
  data: string,
  hora: string,
  diaSemana: string
): string {
  console.log(`[Dispatch] Usando fallback para ${primeiroNome}`);
  return `Olá, ${primeiroNome}!

Você está convidado(a) para:

📌 *${evento.nome}*

📅 ${diaSemana}, ${data}
🕐 ${hora}
📍 ${evento.local}${evento.descricao ? `\n\n${evento.descricao}` : ''}

Confirma sua presença? Aguardo seu retorno!`;
}

/**
 * Gera mensagem de convite (wrapper async)
 */
async function gerarMensagemConvite(
  nomeConvidado: string,
  evento: { nome: string; descricao: string | null; data_hora: string; local: string }
): Promise<string> {
  // Usa IA se disponível
  if (process.env.OPENAI_API_KEY) {
    return gerarMensagemConviteIA(nomeConvidado, evento);
  }

  // Fallback
  const primeiroNome = nomeConvidado.split(' ')[0];
  const { data, hora, diaSemana } = formatarData(evento.data_hora);
  return gerarMensagemFallback(primeiroNome, evento, data, hora, diaSemana);
}

/**
 * Delay básico
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gera número aleatório entre min e max
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calcula delay humanizado baseado na mensagem e posição
 */
function calcularDelayHumanizado(mensagem: string, posicao: number): number {
  // Base: tempo de "digitação" baseado no tamanho da mensagem
  const typingTime = mensagem.length * DELAYS.TYPING_PER_CHAR;

  // Tempo de "pensar" antes de enviar
  const thinkingTime = randomBetween(DELAYS.THINKING_MIN, DELAYS.THINKING_MAX);

  // Delay aleatório entre mensagens
  const randomDelay = randomBetween(DELAYS.MIN_BETWEEN_MESSAGES, DELAYS.MAX_BETWEEN_MESSAGES);

  // Pausa maior a cada N mensagens (simula pessoa fazendo outra coisa)
  const isPauseTime = posicao > 0 && posicao % DELAYS.PAUSE_EVERY_N_MESSAGES === 0;
  const pauseTime = isPauseTime ? randomBetween(DELAYS.PAUSE_MIN, DELAYS.PAUSE_MAX) : 0;

  // Variação adicional para parecer mais humano (±20%)
  const variation = 0.8 + (Math.random() * 0.4);

  const totalDelay = Math.floor((typingTime + thinkingTime + randomDelay + pauseTime) * variation);

  console.log(`[Delay] Posição ${posicao}: ${Math.round(totalDelay/1000)}s ${isPauseTime ? '(com pausa)' : ''}`);

  return totalDelay;
}

/**
 * Processa um batch de disparo
 */
async function processBatch(batch: BatchDB): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: any[];
}> {
  const { id: batchId, evento_id, tenant_id, instance_name } = batch;
  const query = tenantQuery(tenant_id);

  // Verificar se instância ainda está conectada
  const connected = await isInstanceConnected(instance_name);
  if (!connected) {
    throw new Error('Instância WhatsApp desconectada');
  }

  // Buscar evento
  const eventoResult = await pool.query<EventoDB>(
    `SELECT id, nome, descricao, data_hora, local FROM eventos WHERE id = $1`,
    [evento_id]
  );

  if (eventoResult.rows.length === 0) {
    throw new Error('Evento não encontrado');
  }

  const evento = eventoResult.rows[0];

  // Buscar convidados pendentes do batch
  const convidadosResult = await pool.query<ConvidadoDB>(
    `SELECT id, nome, celular FROM evento_convidados
     WHERE dispatch_batch_id = $1
       AND convite_enviado_at IS NULL
     LIMIT $2`,
    [batchId, BATCH_SIZE]
  );

  const convidados = convidadosResult.rows;
  const result = { processed: 0, sent: 0, failed: 0, errors: [] as any[] };

  // Processar cada convidado
  for (let i = 0; i < convidados.length; i++) {
    const convidado = convidados[i];
    result.processed++;

    try {
      // Gerar mensagem única usando IA
      const mensagem = await gerarMensagemConvite(convidado.nome, evento);

      // Enviar via Evolution API
      const sendResult = await sendTextMessage(instance_name, {
        number: formatPhoneNumber(convidado.celular),
        text: mensagem,
      });

      // Atualizar convidado
      await pool.query(
        `UPDATE evento_convidados SET convite_enviado_at = NOW() WHERE id = $1`,
        [convidado.id]
      );

      // Salvar mensagem no histórico
      await query.insert('whatsapp_messages', {
        instance_name,
        phone_number: convidado.celular,
        message_id: sendResult.key?.id,
        message_type: 'conversation',
        message_text: mensagem,
        is_from_me: true,
        status: 'sent',
        timestamp: new Date().toISOString(),
        raw_data: { ...sendResult, evento_id, convidado_id: convidado.id, batch_id: batchId },
      });

      result.sent++;
      console.log(`[Dispatch Batch ${batchId}] ✓ Enviado para ${convidado.nome} (${i + 1}/${convidados.length})`);

      // Delay humanizado entre envios (exceto o último)
      if (i < convidados.length - 1) {
        const delayMs = calcularDelayHumanizado(mensagem, i);
        console.log(`[Dispatch Batch ${batchId}] Aguardando ${Math.round(delayMs/1000)}s antes do próximo envio...`);
        await delay(delayMs);
      }
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        convidado_id: convidado.id,
        nome: convidado.nome,
        error: error.message || 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      });
      console.error(`[Dispatch Batch ${batchId}] Erro ao enviar para ${convidado.nome}:`, error.message);
    }
  }

  return result;
}

/**
 * GET /api/cron/dispatch-batches
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Validar autenticação
  if (!validateCronAuth(request)) {
    console.error('[Dispatch Batches] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Buscar batches pendentes ou em processamento (apenas 1 por vez com delays humanizados)
    const batchesResult = await pool.query<BatchDB>(
      `SELECT * FROM dispatch_batches
       WHERE status IN ('pending', 'processing')
       ORDER BY created_at ASC
       LIMIT 1`,
      []
    );

    if (batchesResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum batch pendente',
        duration: Date.now() - startTime,
      });
    }

    const results: any[] = [];

    for (const batch of batchesResult.rows) {
      try {
        // Marcar como processing
        if (batch.status === 'pending') {
          await pool.query(
            `UPDATE dispatch_batches SET status = 'processing', started_at = NOW() WHERE id = $1`,
            [batch.id]
          );
        }

        // Processar batch
        const batchResult = await processBatch(batch);

        // Atualizar contadores
        const newProcessedCount = batch.processed_count + batchResult.processed;
        const newSentCount = batch.sent_count + batchResult.sent;
        const newFailedCount = batch.failed_count + batchResult.failed;

        // Verificar se batch está completo
        const isComplete = newProcessedCount >= batch.total_count;
        const newStatus = isComplete ? 'completed' : 'processing';

        // Atualizar batch
        await pool.query(
          `UPDATE dispatch_batches SET
            processed_count = $1,
            sent_count = $2,
            failed_count = $3,
            status = $4,
            error_log = error_log || $5::jsonb,
            completed_at = CASE WHEN $4 = 'completed' THEN NOW() ELSE completed_at END
           WHERE id = $6`,
          [
            newProcessedCount,
            newSentCount,
            newFailedCount,
            newStatus,
            JSON.stringify(batchResult.errors),
            batch.id,
          ]
        );

        results.push({
          batch_id: batch.id,
          evento_id: batch.evento_id,
          processed: batchResult.processed,
          sent: batchResult.sent,
          failed: batchResult.failed,
          total_progress: `${newProcessedCount}/${batch.total_count}`,
          status: newStatus,
        });

        console.log(
          `[Dispatch Batches] Batch ${batch.id}: ${batchResult.processed} processados, ` +
          `${batchResult.sent} enviados, ${batchResult.failed} falhas (${newProcessedCount}/${batch.total_count})`
        );

      } catch (error: any) {
        console.error(`[Dispatch Batches] Erro no batch ${batch.id}:`, error);

        // Marcar batch como falho se erro crítico
        await pool.query(
          `UPDATE dispatch_batches SET
            status = 'failed',
            error_log = error_log || $1::jsonb,
            completed_at = NOW()
           WHERE id = $2`,
          [
            JSON.stringify([{ error: error.message, timestamp: new Date().toISOString() }]),
            batch.id,
          ]
        );

        results.push({
          batch_id: batch.id,
          evento_id: batch.evento_id,
          error: error.message,
          status: 'failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      duration: Date.now() - startTime,
      batches_processed: results.length,
      results,
    });

  } catch (error: any) {
    console.error('[Dispatch Batches] Erro geral:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Suporte a POST para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}
