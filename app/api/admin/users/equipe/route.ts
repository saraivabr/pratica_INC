import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * GET /api/admin/users/equipe?gerente_id=xxx
 * Lista corretores da equipe de um gerente
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'gerente')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let gerenteId = searchParams.get('gerente_id');

    // Se é gerente, só pode ver sua própria equipe
    if (user.role === 'gerente') {
      gerenteId = user.id;
    }

    if (!gerenteId) {
      return NextResponse.json({ error: 'gerente_id é obrigatório' }, { status: 400 });
    }

    // Buscar info do gerente
    const { rows: gerenteRows } = await dbQuery(
      `SELECT id, nome, email, telefone, avatar_url FROM users WHERE id = $1 AND role = 'gerente'`,
      [gerenteId]
    );

    if (gerenteRows.length === 0) {
      return NextResponse.json({ error: 'Gerente não encontrado' }, { status: 404 });
    }

    // Buscar corretores da equipe
    const { rows: corretores } = await dbQuery(`
      SELECT 
        u.id, u.nome, u.email, u.telefone, u.avatar_url, u.is_active,
        u.created_at, u.last_login,
        u.imobiliaria_id,
        i.nome as imobiliaria_nome,
        (SELECT COUNT(*) FROM leads WHERE corretor_id = u.id) as total_leads,
        (SELECT COUNT(*) FROM leads WHERE corretor_id = u.id AND status = 'novo') as leads_novos
      FROM users u
      LEFT JOIN imobiliarias i ON i.id = u.imobiliaria_id
      WHERE u.gerente_id = $1
      ORDER BY u.nome ASC
    `, [gerenteId]);

    return NextResponse.json({
      success: true,
      gerente: gerenteRows[0],
      corretores: corretores.map((c: any) => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
        telefone: c.telefone,
        avatar_url: c.avatar_url,
        is_active: c.is_active,
        created_at: c.created_at,
        last_login: c.last_login,
        imobiliaria_id: c.imobiliaria_id,
        imobiliaria_nome: c.imobiliaria_nome,
        total_leads: parseInt(c.total_leads || '0'),
        leads_novos: parseInt(c.leads_novos || '0'),
      })),
      total: corretores.length,
    });
  } catch (error: any) {
    console.error('[Equipe] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
