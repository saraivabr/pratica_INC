import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

// GET /api/agendamentos - Lista agendamentos
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    let date = new Date();
    if (dateParam) {
      try {
        date = new Date(dateParam);
      } catch {
        date = new Date();
      }
    }

    // Buscar agendamentos do dia
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let query = `
      SELECT 
        id,
        lead_id,
        lead_nome,
        corretor_id,
        corretor_nome,
        data_hora,
        tipo,
        status,
        observacoes as titulo,
        created_at
      FROM agendamentos
      WHERE workspace_id = $1
        AND data_hora >= $2
        AND data_hora <= $3
    `;

    const params: any[] = [workspaceId, startOfDay.toISOString(), endOfDay.toISOString()];

    // Filtrar por role
    if (user.role === 'corretor') {
      query += ` AND corretor_nome = $4`;
      params.push(user.nome);
    } else if (user.role === 'gerente') {
      query += ` AND (corretor_nome IN (
        SELECT nome FROM users WHERE gerente_id = $4
      ) OR corretor_nome = (SELECT nome FROM users WHERE id = $4))`;
      params.push(user.id);
    }

    query += ` ORDER BY data_hora ASC`;

    const result = await pool.query(query, params);

    const agendamentos = result.rows.map(row => ({
      id: row.id,
      titulo: row.titulo || row.tipo || 'Agendamento',
      lead_nome: row.lead_nome || 'Cliente',
      cliente: row.lead_nome,
      data_hora: row.data_hora,
      status: row.status || 'pendente',
      tipo: row.tipo,
    }));

    return NextResponse.json({ agendamentos });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos', details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/agendamentos - Criar novo agendamento
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const body = await request.json();

    const { lead_id, lead_nome, data_hora, tipo, observacoes } = body;

    if (!data_hora) {
      return NextResponse.json(
        { error: 'Data e hora são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar data não é passado
    const dataAgendamento = new Date(data_hora);
    const agora = new Date();
    
    if (isNaN(dataAgendamento.getTime())) {
      return NextResponse.json(
        { error: 'Data e hora inválidos' },
        { status: 400 }
      );
    }

    if (dataAgendamento < agora) {
      return NextResponse.json(
        { error: 'Não é possível agendar no passado' },
        { status: 400 }
      );
    }

    // Validar tipo
    const tiposValidos = ['visita', 'ligacao', 'proposta', 'vistoria', 'outro'];
    if (tipo && !tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo de agendamento inválido' },
        { status: 400 }
      );
    }

    const insertQuery = `
      INSERT INTO agendamentos (
        workspace_id, lead_id, lead_nome, corretor_id, corretor_nome,
        data_hora, tipo, status, observacoes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      workspaceId,
      lead_id || null,
      lead_nome || null,
      user.id,
      user.nome,
      data_hora,
      tipo || 'visita',
      'pendente',
      observacoes || '',
    ]);

    return NextResponse.json({
      success: true,
      agendamento: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return NextResponse.json(
      { error: 'Erro ao criar agendamento' },
      { status: 500 }
    );
  }
}
