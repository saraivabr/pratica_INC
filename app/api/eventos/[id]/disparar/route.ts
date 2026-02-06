/**
 * API: Disparar Convites de Evento
 *
 * POST /api/eventos/:id/disparar
 * - Se <= SYNC_LIMIT convidados: processa sincronamente e retorna resultado
 * - Se > SYNC_LIMIT: cria batch para processamento pelo cron
 *
 * GET /api/eventos/:id/disparar?batch_id=xxx
 * Retorna status do batch de disparo
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { isInstanceConnected, sendTextMessage, formatPhoneNumber } from '@/lib/evolution-api';
import { z } from 'zod';
import OpenAI from 'openai';

// Limite de convidados para processamento sincrono
const SYNC_LIMIT = 50;

// Delay entre mensagens (ms) - para parecer humano
const DELAY_BETWEEN_MESSAGES = 3000; // 3 segundos

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
});

// Schema de validacao
const DispararSchema = z.object({
  instance_name: z.string().min(1, 'Nome da instancia WhatsApp e obrigatorio'),
  convidado_ids: z.array(z.string().uuid()).optional(),
  reenviar: z.boolean().optional().default(false),
  com_sofia: z.boolean().optional().default(true),
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

interface ConvidadoDB {
  id: string;
  nome: string;
  celular: string;
  status: string;
  convite_enviado_at: string | null;
}

interface BatchDB {
  id: string;
  evento_id: string;
  workspace_id: number;
  instance_name: string;
  total_count: number;
  processed_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  error_log: any[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
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

  const diasSemana = ['Domingo', 'Segunda-feira', 'Ter\u00E7a-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'S\u00E1bado'];
  const meses = ['janeiro', 'fevereiro', 'mar\u00E7o', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  return {
    data: `${dia}/${mes}`,
    hora: `${hora}:${minuto}`,
    diaSemana: diasSemana[d.getDay()],
    dataCompleta: `${dia} de ${meses[d.getMonth()]} de ${ano}`,
  };
}

/**
 * Gera mensagem de convite usando IA
 */
async function gerarMensagemConviteIA(
  nomeConvidado: string,
  evento: { nome: string; descricao: string | null; data_hora: string; local: string }
): Promise<string> {
  const primeiroNome = nomeConvidado.split(' ')[0];
  const { data, hora, diaSemana, dataCompleta } = formatarData(evento.data_hora);

  const prompt = `Gere uma mensagem de convite para WhatsApp para um evento imobili\u00E1rio.

DADOS DO EVENTO:
- Nome do evento: ${evento.nome}
- Data: ${diaSemana}, ${dataCompleta}
- Hor\u00E1rio: ${hora}
- Local: ${evento.local}
${evento.descricao ? `- Descri\u00E7\u00E3o: ${evento.descricao}` : ''}

DADOS DO CONVIDADO:
- Nome: ${primeiroNome}

REGRAS OBRIGAT\u00D3RIAS:
1. Comece saudando o convidado pelo NOME (${primeiroNome})
2. Use formata\u00E7\u00E3o WhatsApp: *negrito* para destacar o nome do evento
3. Use emojis de forma moderada e profissional (\u{1F4C5} \u{1F550} \u{1F4CD} \u{1F4CC})
4. M\u00E1ximo 400 caracteres
5. Termine pedindo confirma\u00E7\u00E3o de presen\u00E7a de forma educada
6. Tom profissional mas cordial - \u00E9 um convite de uma incorporadora imobili\u00E1ria
7. N\u00C3O use g\u00EDrias ou linguagem muito informal
8. Estruture bem a mensagem com quebras de linha para f\u00E1cil leitura
9. Inclua todas as informa\u00E7\u00F5es essenciais: nome do evento, data, hora e local

Gere APENAS a mensagem, sem explica\u00E7\u00F5es ou coment\u00E1rios.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Voc\u00EA \u00E9 um assistente especializado em criar mensagens profissionais de convite para eventos do mercado imobili\u00E1rio. Suas mensagens s\u00E3o elegantes, bem estruturadas, cordiais e objetivas.',
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
      return mensagem;
    }
  } catch (error) {
    console.error('[Dispatch] Erro ao gerar mensagem com IA:', error);
  }

  // Fallback para template estatico
  return `Ol\u00E1, ${primeiroNome}!

Voc\u00EA est\u00E1 convidado(a) para:

\u{1F4CC} *${evento.nome}*

\u{1F4C5} ${diaSemana}, ${data}
\u{1F550} ${hora}
\u{1F4CD} ${evento.local}${evento.descricao ? `\n\n${evento.descricao}` : ''}

Confirma sua presen\u00E7a? Aguardo seu retorno!`;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Processa envio sincrono de convites
 * Uses the tenant-scoped client for RLS-protected writes (e.g. whatsapp_messages).
 */
async function processarEnviosSincronos(
  convidados: ConvidadoDB[],
  evento: EventoDB,
  instanceName: string,
  workspaceId: number,
  client: import('pg').PoolClient
): Promise<{ enviados: number; falhas: number; erros: any[] }> {
  const resultado = { enviados: 0, falhas: 0, erros: [] as any[] };

  for (let i = 0; i < convidados.length; i++) {
    const convidado = convidados[i];

    try {
      // Gerar mensagem unica
      const mensagem = await gerarMensagemConviteIA(convidado.nome, evento);

      // Enviar via Evolution API
      const sendResult = await sendTextMessage(instanceName, {
        number: formatPhoneNumber(convidado.celular),
        text: mensagem,
      });

      // Atualizar convidado como enviado
      await client.query(
        `UPDATE evento_convidados SET convite_enviado_at = NOW() WHERE id = $1`,
        [convidado.id]
      );

      // Salvar mensagem no historico
      await client.query(
        `INSERT INTO whatsapp_messages (
          workspace_id, instance_name, phone_number, message_id,
          message_type, message_text, is_from_me, status, timestamp, raw_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          workspaceId,
          instanceName,
          convidado.celular,
          sendResult.key?.id || `evt-${Date.now()}`,
          'conversation',
          mensagem,
          true,
          'sent',
          new Date().toISOString(),
          JSON.stringify({ ...sendResult, evento_id: evento.id, convidado_id: convidado.id }),
        ]
      );

      resultado.enviados++;
      console.log(`[Dispatch] Enviado para ${convidado.nome} (${i + 1}/${convidados.length})`);

      // Delay entre envios (exceto o ultimo)
      if (i < convidados.length - 1) {
        await delay(DELAY_BETWEEN_MESSAGES);
      }
    } catch (error: any) {
      resultado.falhas++;
      resultado.erros.push({
        convidado_id: convidado.id,
        nome: convidado.nome,
        error: error.message || 'Erro desconhecido',
      });
      console.error(`[Dispatch] Erro ao enviar para ${convidado.nome}:`, error.message);
    }
  }

  return resultado;
}

/**
 * GET /api/eventos/:id/disparar?batch_id=xxx
 * Retorna status do batch de disparo
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id: eventoId } = await params;
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');

    return await withTenant(workspaceId, async (client) => {
      if (!batchId) {
        // Retornar lista de batches do evento
        const batchesResult = await client.query<BatchDB>(
          `SELECT * FROM dispatch_batches
           WHERE evento_id = $1 AND workspace_id = $2
           ORDER BY created_at DESC
           LIMIT 10`,
          [eventoId, workspaceId]
        );

        return NextResponse.json({
          success: true,
          data: {
            batches: batchesResult.rows,
          },
        });
      }

      // Retornar status especifico do batch
      const batchResult = await client.query<BatchDB>(
        `SELECT * FROM dispatch_batches
         WHERE id = $1 AND evento_id = $2 AND workspace_id = $3`,
        [batchId, eventoId, workspaceId]
      );

      if (batchResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Batch nao encontrado' },
          { status: 404 }
        );
      }

      const batch = batchResult.rows[0];

      // Calcular progresso
      const progress = batch.total_count > 0
        ? Math.round((batch.processed_count / batch.total_count) * 100)
        : 0;

      return NextResponse.json({
        success: true,
        data: {
          batch_id: batch.id,
          status: batch.status,
          progress,
          total: batch.total_count,
          processed: batch.processed_count,
          sent: batch.sent_count,
          failed: batch.failed_count,
          errors: batch.error_log,
          started_at: batch.started_at,
          completed_at: batch.completed_at,
          created_at: batch.created_at,
        },
      });
    });
  } catch (error) {
    console.error('Erro ao consultar status do batch:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao consultar status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/eventos/:id/disparar
 * Dispara convites (sincrono para poucos, batch para muitos)
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
    const validationResult = DispararSchema.safeParse(body);

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

    const { instance_name, convidado_ids, reenviar, com_sofia } = validationResult.data;

    // Verificar conexao WhatsApp
    const connected = await isInstanceConnected(instance_name);
    if (!connected) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp nao esta conectado. Conecte primeiro.' },
        { status: 400 }
      );
    }

    return await withTenant(workspaceId, async (client) => {
      // Buscar evento
      const eventoResult = await client.query<EventoDB>(
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

      // Verificar se evento pode receber disparos
      if (evento.status === 'cancelado') {
        return NextResponse.json(
          { success: false, error: 'Nao e possivel disparar convites de evento cancelado' },
          { status: 400 }
        );
      }

      if (evento.status === 'finalizado') {
        return NextResponse.json(
          { success: false, error: 'Evento ja foi finalizado' },
          { status: 400 }
        );
      }

      // Verificar se ja existe batch em processamento
      const activeBatchResult = await client.query<BatchDB>(
        `SELECT * FROM dispatch_batches
         WHERE evento_id = $1 AND workspace_id = $2 AND status IN ('pending', 'processing')
         LIMIT 1`,
        [eventoId, workspaceId]
      );

      if (activeBatchResult.rows.length > 0) {
        const activeBatch = activeBatchResult.rows[0];
        return NextResponse.json({
          success: false,
          error: 'Ja existe um disparo em andamento para este evento',
          data: {
            batch_id: activeBatch.id,
            status: activeBatch.status,
            progress: activeBatch.total_count > 0
              ? Math.round((activeBatch.processed_count / activeBatch.total_count) * 100)
              : 0,
          },
        }, { status: 409 });
      }

      // Buscar convidados para envio
      let convidadosQuery = `
        SELECT id, nome, celular, status, convite_enviado_at
        FROM evento_convidados
        WHERE evento_id = $1 AND workspace_id = $2
      `;
      const queryParams: any[] = [eventoId, workspaceId];

      // Filtrar por IDs especificos ou status
      if (convidado_ids && convidado_ids.length > 0) {
        convidadosQuery += ` AND id = ANY($3)`;
        queryParams.push(convidado_ids);
      } else if (!reenviar) {
        // Se nao for reenvio, pegar apenas pendentes sem convite enviado
        convidadosQuery += ` AND (convite_enviado_at IS NULL)`;
      }

      const convidadosResult = await client.query<ConvidadoDB>(convidadosQuery, queryParams);
      const convidados = convidadosResult.rows;

      if (convidados.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            enviados: 0,
            falhas: 0,
            total: 0,
          },
          message: 'Nenhum convidado para enviar convite',
        });
      }

      // Atualizar status do evento para ativo se estiver em rascunho
      if (evento.status === 'rascunho') {
        await client.query(
          `UPDATE eventos SET status = 'ativo', com_sofia = $1, updated_at = NOW() WHERE id = $2`,
          [com_sofia, eventoId]
        );
      } else {
        await client.query(
          `UPDATE eventos SET com_sofia = $1, updated_at = NOW() WHERE id = $2`,
          [com_sofia, eventoId]
        );
      }

      // ========================================
      // PROCESSAMENTO SINCRONO (ate SYNC_LIMIT)
      // ========================================
      if (convidados.length <= SYNC_LIMIT) {
        console.log(`[Dispatch] Processamento SINCRONO: ${convidados.length} convidados para evento ${eventoId}`);

        const resultado = await processarEnviosSincronos(
          convidados,
          evento,
          instance_name,
          workspaceId,
          client
        );

        console.log(`[Dispatch] Concluido: ${resultado.enviados} enviados, ${resultado.falhas} falhas`);

        return NextResponse.json({
          success: true,
          data: {
            enviados: resultado.enviados,
            falhas: resultado.falhas,
            total: convidados.length,
            erros: resultado.erros,
          },
          message: `${resultado.enviados} convite(s) enviado(s) com sucesso!`,
        });
      }

      // ========================================
      // PROCESSAMENTO VIA BATCH (> SYNC_LIMIT)
      // ========================================
      console.log(`[Dispatch] Criando BATCH: ${convidados.length} convidados para evento ${eventoId}`);

      // Use transaction within the withTenant client (already has RLS context)
      let batchId: string;

      try {
        await client.query('BEGIN');

        // Criar batch de disparo
        const batchResult = await client.query<{ id: string }>(
          `INSERT INTO dispatch_batches (
            evento_id, workspace_id, instance_name, total_count, status
          ) VALUES ($1, $2, $3, $4, 'pending')
          RETURNING id`,
          [eventoId, workspaceId, instance_name, convidados.length]
        );

        batchId = batchResult.rows[0].id;

        // Vincular convidados ao batch
        const convidadoIds = convidados.map(c => c.id);
        await client.query(
          `UPDATE evento_convidados
           SET dispatch_batch_id = $1
           WHERE id = ANY($2)`,
          [batchId, convidadoIds]
        );

        await client.query('COMMIT');
        console.log(`[Dispatch] Batch ${batchId} criado: ${convidados.length} convidados`);
      } catch (txError) {
        await client.query('ROLLBACK');
        console.error('[Dispatch] Erro na transacao de batch:', txError);
        throw txError;
      }

      return NextResponse.json({
        success: true,
        data: {
          batch_id: batchId,
          total: convidados.length,
          status: 'pending',
          message: `Batch criado com ${convidados.length} convidado(s). O processamento sera iniciado em breve.`,
          poll_url: `/api/eventos/${eventoId}/disparar?batch_id=${batchId}`,
        },
      });
    });
  } catch (error: any) {
    console.error('[Dispatch] Erro ao disparar convites:', error);
    console.error('[Dispatch] Stack:', error?.stack);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erro ao disparar convites' },
      { status: 500 }
    );
  }
}
