/**
 * API: Atualizar Perfil do Usuário
 *
 * GET /api/auth/profile - Buscar dados do perfil
 * PATCH /api/auth/profile - Atualizar dados do perfil
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { dbQuery } from '@/lib/db';
import { normalizePhone } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar dados completos do usuário
    const result = await dbQuery(
      `SELECT id, nome, email, telefone, creci, role, avatar_url, created_at
       FROM users WHERE id = $1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { nome, telefone, creci } = body;

    // Validações básicas
    if (nome && nome.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nome deve ter pelo menos 2 caracteres' },
        { status: 400 }
      );
    }

    // Construir query de atualização dinamicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (nome !== undefined) {
      updates.push(`nome = $${paramIndex++}`);
      values.push(nome);
    }

    if (telefone !== undefined) {
      updates.push(`telefone = $${paramIndex++}`);
      values.push(normalizePhone(telefone));
    }

    if (creci !== undefined) {
      updates.push(`creci = $${paramIndex++}`);
      values.push(creci);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    // Adicionar updated_at
    updates.push(`updated_at = now()`);

    // Adicionar user id ao final dos valores
    values.push(user.id);

    const result = await dbQuery(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, nome, email, telefone, creci, role, avatar_url`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
