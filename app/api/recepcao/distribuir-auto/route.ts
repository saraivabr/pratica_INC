/**
 * API: Distribuição Automática de Leads
 *
 * POST /api/recepcao/distribuir-auto - Distribui lead automaticamente para próximo corretor
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const DistribuirAutoSchema = z.object({
  plantao_id: z.string().uuid('ID do plantão inválido'),
  cvcrm_lead_id: z.number().int().positive().optional(),
  lead_nome: z.string().min(1).max(255),
  lead_telefone: z.string().max(50).optional(),
  lead_email: z.string().email().optional(),
  max_leads_ativos: z.number().int().min(1).max(10).default(5),
});

interface DistribuicaoResult {
  atribuicao_id: string | null;
  corretor_user_id: string | null;
  corretor_nome: string | null;
  corretor_telefone: string | null;
  sucesso: boolean;
  mensagem: string;
}

/**
 * POST /api/recepcao/distribuir-auto
 * Distribui um lead automaticamente para o próximo corretor disponível
 */
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    const body = await request.json();
    const validationResult = DistribuirAutoSchema.safeParse(body);

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
      cvcrm_lead_id,
      lead_nome,
      lead_telefone,
      lead_email,
      max_leads_ativos,
    } = validationResult.data;

    // Verificar se plantão está ativo
    const plantaoCheck = await client.query(
      `SELECT id FROM recepcao_plantoes WHERE id = $1 AND status = 'ativo'`,
      [plantao_id]
    );

    if (plantaoCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plantão não encontrado ou não está ativo' },
        { status: 404 }
      );
    }

    // Chamar função de distribuição automática
    const result = await client.query<DistribuicaoResult>(
      `SELECT * FROM distribuir_lead_auto($1, $2, $3, $4, $5, $6, $7)`,
      [
        workspaceId,
        plantao_id,
        cvcrm_lead_id || null,
        lead_nome,
        lead_telefone || null,
        lead_email || null,
        max_leads_ativos,
      ]
    );

    const distribuicao = result.rows[0];

    // Registrar no log
    await client.query(
      `INSERT INTO recepcao_distribuicao_log
       (workspace_id, plantao_id, atribuicao_id, cvcrm_lead_id, corretor_user_id, sucesso, mensagem)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        workspaceId,
        plantao_id,
        distribuicao.atribuicao_id,
        cvcrm_lead_id || null,
        distribuicao.corretor_user_id,
        distribuicao.sucesso,
        distribuicao.mensagem,
      ]
    );

    if (!distribuicao.sucesso) {
      return NextResponse.json(
        {
          success: false,
          error: distribuicao.mensagem,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          atribuicao_id: distribuicao.atribuicao_id,
          corretor: {
            user_id: distribuicao.corretor_user_id,
            nome: distribuicao.corretor_nome,
            telefone: distribuicao.corretor_telefone,
          },
        },
        message: `Lead distribuído automaticamente para ${distribuicao.corretor_nome}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro na distribuição automática:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao distribuir lead automaticamente' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
