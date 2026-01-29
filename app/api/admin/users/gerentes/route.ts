import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/api-auth';

/**
 * GET /api/admin/users/gerentes
 * Lista todos os gerentes com contagem de corretores na equipe
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { rows } = await dbQuery(`
      SELECT 
        u.id, u.nome, u.email, u.telefone, u.avatar_url, u.is_active,
        u.imobiliaria_id,
        i.nome as imobiliaria_nome,
        COUNT(c.id) as total_corretores,
        (SELECT COUNT(*) FROM leads WHERE corretor_id IN (
          SELECT id FROM users WHERE gerente_id = u.id
        )) as total_leads
      FROM users u
      LEFT JOIN imobiliarias i ON i.id = u.imobiliaria_id
      LEFT JOIN users c ON c.gerente_id = u.id
      WHERE u.role = 'gerente'
      GROUP BY u.id, u.nome, u.email, u.telefone, u.avatar_url, u.is_active,
               u.imobiliaria_id, i.nome
      ORDER BY u.nome ASC
    `);

    return NextResponse.json({
      success: true,
      gerentes: rows.map((g: any) => ({
        id: g.id,
        nome: g.nome,
        email: g.email,
        telefone: g.telefone,
        avatar_url: g.avatar_url,
        is_active: g.is_active,
        imobiliaria_id: g.imobiliaria_id,
        imobiliaria_nome: g.imobiliaria_nome,
        total_corretores: parseInt(g.total_corretores || '0'),
        total_leads: parseInt(g.total_leads || '0'),
      })),
    });
  } catch (error: any) {
    console.error('[Gerentes] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
