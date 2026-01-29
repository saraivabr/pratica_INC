import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - List propostas
export async function GET() {
  try {
    const query = `
      SELECT 
        p.*,
        l.nome as lead_nome,
        e.nome as empreendimento_nome
      FROM cvcrm_propostas p
      LEFT JOIN cvcrm_leads l ON l.id = p.lead_id
      LEFT JOIN cvcrm_empreendimentos e ON e.id = p.empreendimento_id
      ORDER BY p.created_at DESC
      LIMIT 100
    `;

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      propostas: result.rows
    });

  } catch (error: any) {
    console.error('[Propostas API] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create proposta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      lead_id, 
      empreendimento_id, 
      unidade_id,
      valor_proposta, 
      valor_entrada, 
      prazo_meses,
      observacoes 
    } = body;

    if (!lead_id || !valor_proposta) {
      return NextResponse.json(
        { error: 'lead_id e valor_proposta são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar valores não negativos
    if (valor_proposta <= 0) {
      return NextResponse.json(
        { error: 'Valor da proposta deve ser maior que zero' },
        { status: 400 }
      );
    }

    if (valor_entrada && valor_entrada < 0) {
      return NextResponse.json(
        { error: 'Valor de entrada não pode ser negativo' },
        { status: 400 }
      );
    }

    if (valor_entrada && valor_entrada > valor_proposta) {
      return NextResponse.json(
        { error: 'Valor de entrada não pode ser maior que valor da proposta' },
        { status: 400 }
      );
    }

    // Validar prazo
    if (prazo_meses && (prazo_meses < 1 || prazo_meses > 360)) {
      return NextResponse.json(
        { error: 'Prazo deve estar entre 1 e 360 meses' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO cvcrm_propostas (
        lead_id, empreendimento_id, unidade_id,
        valor_proposta, valor_entrada, prazo_meses, observacoes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(query, [
      lead_id,
      empreendimento_id,
      unidade_id,
      valor_proposta,
      valor_entrada,
      prazo_meses,
      observacoes
    ]);

    return NextResponse.json({
      success: true,
      proposta: result.rows[0]
    });

  } catch (error: any) {
    console.error('[Propostas API] Erro ao criar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update proposta
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const fields = Object.keys(updates).map((key, idx) => `${key} = $${idx + 2}`).join(', ');
    const values = Object.values(updates);

    const query = `
      UPDATE cvcrm_propostas
      SET ${fields}, 
          updated_at = NOW(),
          ${status === 'enviada' ? 'enviada_em = NOW(),' : ''}
          ${status === 'aceita' || status === 'recusada' ? 'respondida_em = NOW(),' : ''}
          status = COALESCE($${values.length + 2}, status)
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, ...values, status]);

    return NextResponse.json({
      success: true,
      proposta: result.rows[0]
    });

  } catch (error: any) {
    console.error('[Propostas API] Erro ao atualizar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    await pool.query('DELETE FROM cvcrm_propostas WHERE id = $1', [id]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Propostas API] Erro ao deletar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
