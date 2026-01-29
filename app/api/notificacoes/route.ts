/**
 * API de Notificações
 * 
 * GET /api/notificacoes - Lista notificações do usuário
 * POST /api/notificacoes - Cria nova notificação
 * PATCH /api/notificacoes/[id] - Marca como lida
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

// GET /api/notificacoes - Lista notificações
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const apenasNaoLidas = searchParams.get('nao_lidas') === 'true';

    let query = `
      SELECT 
        n.*,
        l.name as lead_nome
      FROM notificacoes n
      LEFT JOIN leads l ON l.id = n.lead_id
      WHERE n.user_id = $1 AND n.workspace_id = $2
    `;
    
    const params: any[] = [user.id, workspaceId];

    if (apenasNaoLidas) {
      query += ` AND n.lida = false`;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $3 OFFSET $4`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Buscar contadores
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE lida = false) as nao_lidas,
        COUNT(*) as total
      FROM notificacoes
      WHERE user_id = $1 AND workspace_id = $2`,
      [user.id, workspaceId]
    );

    return NextResponse.json({
      notificacoes: result.rows,
      stats: statsResult.rows[0] || { nao_lidas: 0, total: 0 }
    });

  } catch (error: any) {
    console.error('[Notificações] GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
      { status: 500 }
    );
  }
}

// POST /api/notificacoes - Cria notificação
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, tenantId, user } = ctx;
    const body = await request.json();

    const {
      user_id, // Se não fornecido, usa o próprio usuário
      tipo,
      titulo,
      mensagem,
      lead_id,
      dados,
      acao_url,
      acao_label,
      prioridade = 'normal'
    } = body;

    if (!tipo || !titulo || !mensagem) {
      return NextResponse.json(
        { error: 'tipo, titulo e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO notificacoes (
        tenant_id,
        workspace_id,
        user_id,
        tipo,
        titulo,
        mensagem,
        lead_id,
        dados,
        acao_url,
        acao_label,
        prioridade
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        tenantId,
        workspaceId,
        user_id || user.id,
        tipo,
        titulo,
        mensagem,
        lead_id || null,
        dados ? JSON.stringify(dados) : '{}',
        acao_url || null,
        acao_label || null,
        prioridade
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });

  } catch (error: any) {
    console.error('[Notificações] POST error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar notificação' },
      { status: 500 }
    );
  }
}
