/**
 * API: Atribuir Lead ao Corretor
 *
 * POST /api/recepcao/atribuir - Atribui lead ao próximo corretor da fila
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const AtribuirSchema = z.object({
  plantao_id: z.string().uuid('ID do plantão inválido'),
  lead_nome: z.string().min(1, 'Nome do lead é obrigatório').max(255).optional(),
  lead_telefone: z.string().max(50).optional(),
  lead_email: z.string().email('Email inválido').optional(),
  lead_origem: z.enum(['presencial', 'telefone', 'whatsapp']).default('presencial'),
  lead_observacoes: z.string().optional(),
  presenca_id: z.string().uuid('ID da presença inválido').optional(), // Para atribuir a corretor específico
});

interface AtribuicaoDB {
  id: string;
  workspace_id: number;
  plantao_id: string;
  presenca_id: string;
  user_id: string;
  lead_nome: string | null;
  lead_telefone: string | null;
  lead_email: string | null;
  lead_origem: string;
  lead_observacoes: string | null;
  atribuido_at: string;
  atribuido_por: string | null;
}

interface ProximoCorretor {
  presenca_id: string;
  user_id: string;
  user_nome: string;
  user_telefone: string;
  posicao_fila: number;
}

/**
 * POST /api/recepcao/atribuir
 * Atribui lead ao próximo corretor da fila (roleta)
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const body = await request.json();
    const validationResult = AtribuirSchema.safeParse(body);

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

    const {
      plantao_id,
      lead_nome,
      lead_telefone,
      lead_email,
      lead_origem,
      lead_observacoes,
      presenca_id: presencaIdEspecifica,
    } = validationResult.data;

    await client.query('BEGIN');

    // Verificar se plantão está ativo
    const plantaoCheck = await client.query(
      `SELECT id FROM recepcao_plantoes WHERE id = $1 AND status = 'ativo'`,
      [plantao_id]
    );

    if (plantaoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Plantão não encontrado ou não está ativo' },
        { status: 404 }
      );
    }

    let presencaId: string;
    let userId: string;
    let corretorNome: string;

    if (presencaIdEspecifica) {
      // Atribuir a corretor específico (verificando se está disponível)
      const presencaCheck = await client.query<{
        id: string;
        user_id: string;
        user_nome: string;
      }>(
        `SELECT p.id, p.user_id, u.nome AS user_nome
         FROM recepcao_presencas p
         JOIN users u ON u.id = p.user_id
         WHERE p.id = $1 AND p.plantao_id = $2
           AND p.status = 'presente'
           AND p.em_atendimento = false
           AND p.pausado = false
           AND p.feedback_pendente = false`,
        [presencaIdEspecifica, plantao_id]
      );

      if (presencaCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Corretor não está disponível para receber lead' },
          { status: 400 }
        );
      }

      presencaId = presencaCheck.rows[0].id;
      userId = presencaCheck.rows[0].user_id;
      corretorNome = presencaCheck.rows[0].user_nome;
    } else {
      // Buscar próximo corretor da fila (roleta)
      const proximoResult = await client.query<ProximoCorretor>(
        `SELECT * FROM get_proximo_corretor_fila($1)`,
        [plantao_id]
      );

      if (proximoResult.rows.length === 0 || !proximoResult.rows[0].presenca_id) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Não há corretores disponíveis na fila' },
          { status: 400 }
        );
      }

      const proximo = proximoResult.rows[0];
      presencaId = proximo.presenca_id;
      userId = proximo.user_id;
      corretorNome = proximo.user_nome;
    }

    // Marcar corretor como em atendimento e com feedback pendente
    await client.query(
      `UPDATE recepcao_presencas
       SET em_atendimento = true, feedback_pendente = true, updated_at = NOW()
       WHERE id = $1`,
      [presencaId]
    );

    // Criar atribuição
    const atribuicaoResult = await client.query<AtribuicaoDB>(
      `INSERT INTO recepcao_atribuicoes
       (workspace_id, plantao_id, presenca_id, user_id, lead_nome, lead_telefone, lead_email, lead_origem, lead_observacoes, atribuido_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        workspaceId,
        plantao_id,
        presencaId,
        userId,
        lead_nome || null,
        lead_telefone || null,
        lead_email || null,
        lead_origem,
        lead_observacoes || null,
        (user as any).id,
      ]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        data: {
          atribuicao: atribuicaoResult.rows[0],
          corretor: {
            user_id: userId,
            nome: corretorNome,
          },
        },
        message: `Lead atribuído a ${corretorNome}`,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atribuir lead:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atribuir lead' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
