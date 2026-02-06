/**
 * API: Enviar Feedback da Atribuição
 *
 * POST /api/recepcao/atribuicoes/:id/feedback - Envia feedback (obrigatório para voltar à fila)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const FeedbackSchema = z.object({
  feedback_status: z.enum([
    'interessado',
    'sem_interesse',
    'agendou_visita',
    'fechou_negocio',
    'nao_compareceu',
    'outro',
  ]),
  feedback_observacoes: z.string().optional(),
});

interface AtribuicaoDB {
  id: string;
  user_id: string;
  presenca_id: string;
  feedback_status: string | null;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/recepcao/atribuicoes/:id/feedback
 * Envia feedback e libera corretor para voltar à fila
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const { id } = await params;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de atribuição inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = FeedbackSchema.safeParse(body);

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

    const { feedback_status, feedback_observacoes } = validationResult.data;

    await client.query('BEGIN');

    // Verificar se atribuição existe
    const checkResult = await client.query<AtribuicaoDB>(
      `SELECT id, user_id, presenca_id, feedback_status FROM recepcao_atribuicoes
       WHERE id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Atribuição não encontrada' },
        { status: 404 }
      );
    }

    const atribuicao = checkResult.rows[0];

    // Verificar se é o corretor correto
    if (atribuicao.user_id !== (user as any).id) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Esta atribuição pertence a outro corretor' },
        { status: 403 }
      );
    }

    // Verificar se já tem feedback
    if (atribuicao.feedback_status) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Feedback já foi enviado para esta atribuição' },
        { status: 400 }
      );
    }

    // Salvar feedback e finalizar atendimento
    const updateResult = await client.query(
      `UPDATE recepcao_atribuicoes
       SET feedback_status = $1,
           feedback_observacoes = $2,
           feedback_at = NOW(),
           atendimento_finalizado_at = NOW(),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [feedback_status, feedback_observacoes || null, id]
    );

    // Liberar corretor: remover flags, decrementar leads_ativos e mover para fim da fila
    await client.query(
      `UPDATE recepcao_presencas
       SET em_atendimento = false,
           feedback_pendente = false,
           leads_ativos = GREATEST(leads_ativos - 1, 0),
           updated_at = NOW()
       WHERE id = $1`,
      [atribuicao.presenca_id]
    );

    // Verificar se corretor ainda tem leads pendentes de feedback (prazo 24h)
    // Se não tiver, liberar o flag feedback_pendente
    const pendentesResult = await client.query(
      `SELECT COUNT(*) AS pendentes FROM recepcao_atribuicoes
       WHERE presenca_id = $1
         AND feedback_status IS NULL
         AND atribuido_at < NOW() - INTERVAL '24 hours'`,
      [atribuicao.presenca_id]
    );

    const pendentes = parseInt(pendentesResult.rows[0]?.pendentes || '0', 10);

    // Se ainda tem pendências antigas, manter o flag
    if (pendentes > 0) {
      await client.query(
        `UPDATE recepcao_presencas SET feedback_pendente = true WHERE id = $1`,
        [atribuicao.presenca_id]
      );
    }

    // Mover para fim da fila
    await client.query(
      `SELECT mover_corretor_fim_fila($1)`,
      [atribuicao.presenca_id]
    );

    // Obter nova posição na fila
    const posicaoResult = await client.query<{ posicao_fila: number }>(
      `SELECT posicao_fila FROM recepcao_presencas WHERE id = $1`,
      [atribuicao.presenca_id]
    );

    await client.query('COMMIT');

    const novaPosicao = posicaoResult.rows[0]?.posicao_fila || 0;

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
      message: `Feedback enviado! Você voltou para a fila na posição ${novaPosicao}.`,
      nova_posicao: novaPosicao,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao enviar feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar feedback' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
