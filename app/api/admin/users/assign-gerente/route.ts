import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * POST /api/admin/users/assign-gerente
 * Atribuir gerente_id a corretores (batch)
 * 
 * Body:
 * {
 *   gerente_id: string (UUID) | null,  // null para remover gerente
 *   corretor_ids: string[]             // UUIDs dos corretores
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { gerente_id, corretor_ids } = body;

    if (!corretor_ids || !Array.isArray(corretor_ids) || corretor_ids.length === 0) {
      return NextResponse.json({ error: 'corretor_ids é obrigatório (array de UUIDs)' }, { status: 400 });
    }

    // Validar gerente (se não for null)
    if (gerente_id) {
      const { rows: gerenteCheck } = await dbQuery(
        `SELECT id, role FROM users WHERE id = $1`,
        [gerente_id]
      );
      
      if (gerenteCheck.length === 0) {
        return NextResponse.json({ error: 'Gerente não encontrado' }, { status: 404 });
      }

      // Se o user não é gerente, promover para gerente
      if (gerenteCheck[0].role !== 'gerente' && gerenteCheck[0].role !== 'admin') {
        await dbQuery(
          `UPDATE users SET role = 'gerente' WHERE id = $1`,
          [gerente_id]
        );
      }
    }

    // Prevenir auto-atribuição (gerente não pode ser corretor de si mesmo)
    const filteredIds = corretor_ids.filter((id: string) => id !== gerente_id);
    
    if (filteredIds.length === 0) {
      return NextResponse.json({ error: 'Gerente não pode ser atribuído a si mesmo' }, { status: 400 });
    }

    // Atualizar corretores em batch
    const placeholders = filteredIds.map((_: string, i: number) => `$${i + 2}`).join(', ');
    const { rowCount } = await dbQuery(
      `UPDATE users SET gerente_id = $1, updated_at = now() 
       WHERE id IN (${placeholders}) AND id != COALESCE($1, '00000000-0000-0000-0000-000000000000'::uuid)`,
      [gerente_id, ...filteredIds]
    );

    return NextResponse.json({
      success: true,
      updated: rowCount,
      gerente_id,
      corretor_ids: filteredIds,
      message: gerente_id 
        ? `${rowCount} corretor(es) atribuído(s) ao gerente`
        : `${rowCount} corretor(es) removido(s) do gerente`,
    });
  } catch (error: any) {
    console.error('[Assign Gerente] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
