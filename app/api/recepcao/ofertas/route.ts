/**
 * API: Ofertas/Ligacoes da Roleta
 *
 * POST /api/recepcao/ofertas - Registrar nova oferta
 * GET /api/recepcao/ofertas - Listar ofertas (com filtros)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { z } from 'zod';

const OfertaSchema = z.object({
  plantao_id: z.string().uuid('ID do plantao invalido'),
  empreendimento_id: z.number().nullable().optional(),
  empreendimento_nome: z.string().min(1, 'Nome do empreendimento e obrigatorio'),
  lead_origem: z.enum([
    'ligacao', 'whatsapp', 'presencial', 'facebook', 'instagram', 'qr_terreno'
  ], { message: 'Origem invalida' }),
  lead_telefone: z.string().optional(),
  lead_nome: z.string().optional(),
});

interface OfertaResult {
  oferta_id: string;
  total_ofertas: number;
  qualificado: boolean;
  faltam: number;
}

/**
 * POST /api/recepcao/ofertas
 * Registrar nova oferta/ligacao
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const body = await request.json();
    const validationResult = OfertaSchema.safeParse(body);

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
      empreendimento_id,
      empreendimento_nome,
      lead_origem,
      lead_telefone,
      lead_nome,
    } = validationResult.data;

    // Verificar se usuario tem presenca ativa no plantao
    const presencaCheck = await pool.query<{ id: string }>(
      `SELECT id FROM recepcao_presencas
       WHERE plantao_id = $1 AND user_id = $2 AND status = 'presente'`,
      [plantao_id, (user as any).id]
    );

    if (presencaCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Voce precisa fazer check-in no plantao primeiro' },
        { status: 400 }
      );
    }

    const presenca_id = presencaCheck.rows[0].id;

    // Registrar oferta usando funcao do banco
    const result = await pool.query<OfertaResult>(
      `SELECT * FROM registrar_oferta($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        workspaceId,
        plantao_id,
        presenca_id,
        (user as any).id,
        empreendimento_id || null,
        empreendimento_nome,
        lead_origem,
        lead_telefone || null,
        lead_nome || null,
      ]
    );

    const ofertaResult = result.rows[0];

    // Montar resposta com mensagem motivacional
    let message: string;
    if (ofertaResult.qualificado) {
      if (ofertaResult.total_ofertas === 30) {
        message = 'Parabens! Voce esta qualificado para a Roleta de Leads!';
      } else {
        message = `Oferta registrada! Total: ${ofertaResult.total_ofertas}`;
      }
    } else {
      message = `Oferta registrada! Agora sao ${ofertaResult.total_ofertas}/30. `;
      if (ofertaResult.faltam <= 5) {
        message += `So mais ${ofertaResult.faltam}!`;
      } else if (ofertaResult.faltam <= 15) {
        message += 'Continue assim!';
      } else {
        message += 'Cada oferta conta!';
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          oferta_id: ofertaResult.oferta_id,
          total_ofertas: ofertaResult.total_ofertas,
          qualificado: ofertaResult.qualificado,
          faltam: ofertaResult.faltam,
          just_qualified: ofertaResult.qualificado && ofertaResult.total_ofertas === 30,
        },
        message,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erro ao registrar oferta:', error);

    return NextResponse.json(
      { success: false, error: 'Erro ao registrar oferta' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recepcao/ofertas
 * Listar ofertas do usuario
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const searchParams = request.nextUrl.searchParams;
    const plantao_id = searchParams.get('plantao_id');
    const rawLimit = parseInt(searchParams.get('limit') || '50');
    const rawOffset = parseInt(searchParams.get('offset') || '0');
    // Sanitize inputs to prevent NaN and enforce bounds
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100);
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    // Construir query
    let query = `
      SELECT
        o.id,
        o.empreendimento_id,
        o.empreendimento_nome,
        o.lead_origem,
        o.lead_telefone,
        o.lead_nome,
        o.created_at,
        p.data AS plantao_data,
        l.nome AS local_nome
      FROM roleta_ofertas o
      JOIN recepcao_plantoes p ON p.id = o.plantao_id
      JOIN recepcao_locais l ON l.id = p.local_id
      WHERE o.workspace_id = $1 AND o.user_id = $2
    `;

    const params: any[] = [workspaceId, (user as any).id];
    let paramIndex = 3;

    if (plantao_id) {
      query += ` AND o.plantao_id = $${paramIndex}`;
      params.push(plantao_id);
      paramIndex++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Buscar contagem total
    let countQuery = `
      SELECT COUNT(*) AS total FROM roleta_ofertas
      WHERE workspace_id = $1 AND user_id = $2
    `;
    const countParams: any[] = [workspaceId, (user as any).id];

    if (plantao_id) {
      countQuery += ` AND plantao_id = $3`;
      countParams.push(plantao_id);
    }

    const countResult = await pool.query<{ total: string }>(countQuery, countParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Erro ao listar ofertas:', error);

    return NextResponse.json(
      { success: false, error: 'Erro ao listar ofertas' },
      { status: 500 }
    );
  }
}
