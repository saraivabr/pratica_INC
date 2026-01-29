import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - List activities
export async function GET(request: NextRequest) {
  try {
    // Get activities from leads with follow-up dates
    const query = `
      SELECT 
        l.id,
        l.nome as title,
        'follow_up' as activity_type,
        l.proximo_contato as scheduled_at,
        'Contato agendado com ' || l.nome as description,
        l.status,
        CASE 
          WHEN l.proximo_contato < NOW() THEN 'high'
          WHEN l.proximo_contato < NOW() + INTERVAL '1 day' THEN 'urgent'
          ELSE 'medium'
        END as priority,
        e.nome as empreendimento,
        l.telefone
      FROM cvcrm_leads l
      LEFT JOIN cvcrm_empreendimentos e ON e.id = l.empreendimento_id
      WHERE l.proximo_contato IS NOT NULL
        AND l.proximo_contato >= NOW() - INTERVAL '7 days'
      ORDER BY l.proximo_contato ASC
      LIMIT 100
    `;

    const result = await pool.query(query);

    const activities = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      activity_type: row.activity_type,
      scheduled_at: row.scheduled_at,
      priority: row.priority,
      status: row.status === 'ganho' || row.status === 'perdido' ? 'completed' : 'pending',
      lead: {
        nome: row.title,
        telefone: row.telefone,
        empreendimento: row.empreendimento
      }
    }));

    return NextResponse.json(activities);

  } catch (error: any) {
    console.error('[Activities API] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create activity  
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, activity_type, priority, scheduled_at, lead_id } = body;

    if (!title || !scheduled_at) {
      return NextResponse.json(
        { error: 'title e scheduled_at são obrigatórios' },
        { status: 400 }
      );
    }

    // If there's a lead_id, update the lead's proximo_contato
    if (lead_id) {
      await pool.query(
        'UPDATE cvcrm_leads SET proximo_contato = $1 WHERE id = $2',
        [scheduled_at, lead_id]
      );

      const activity = {
        id: lead_id,
        title,
        description,
        activity_type,
        priority,
        scheduled_at,
        status: 'pending'
      };

      return NextResponse.json(activity);
    }

    // Create in agendamentos table
    const query = `
      INSERT INTO cvcrm_agendamentos (data_hora, tipo, observacoes, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pool.query(query, [
      scheduled_at,
      activity_type || 'follow_up',
      description || title,
      'pendente'
    ]);

    const activity = {
      id: result.rows[0].id,
      title,
      description,
      activity_type,
      priority,
      scheduled_at,
      status: 'pending'
    };

    return NextResponse.json(activity);

  } catch (error: any) {
    console.error('[Activities API] Erro ao criar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update activity
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, outcome, completed_at } = body;

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Try updating lead status
    await pool.query(
      `UPDATE cvcrm_leads 
       SET status = CASE WHEN $1 = 'completed' THEN 'ganho' ELSE status END,
           proximo_contato = NULL
       WHERE id = $2`,
      [status, id]
    );

    return NextResponse.json({ id, status, completed_at, outcome });

  } catch (error: any) {
    console.error('[Activities API] Erro ao atualizar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete activity
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    // Clear proximo_contato from lead
    await pool.query('UPDATE cvcrm_leads SET proximo_contato = NULL WHERE id = $1', [id]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Activities API] Erro ao deletar:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
