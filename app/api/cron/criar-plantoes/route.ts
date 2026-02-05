/**
 * Cron: Criar Plantões Automáticos
 *
 * Roda diariamente (sugerido: 00:05 ou 06:00) para criar os plantões do dia
 * baseado nos templates recorrentes ativos.
 *
 * Pode ser chamado:
 * - Via cron job externo (Vercel Cron, GitHub Actions, etc.)
 * - Manualmente pelo admin
 *
 * POST /api/cron/criar-plantoes
 * Body opcional: { data: "2026-02-05" } para criar de data específica
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Verificar CRON_SECRET para chamadas automatizadas
const CRON_SECRET = process.env.CRON_SECRET;

interface CriacaoResult {
  plantao_id: string | null;
  recorrente_id: string | null;
  local_nome: string;
  sucesso: boolean;
  mensagem: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-cron-secret');

    // Aceitar: Bearer token, x-cron-secret header, ou chamada interna (sem auth em dev)
    const isAuthorized =
      (CRON_SECRET && (authHeader === `Bearer ${CRON_SECRET}` || cronSecret === CRON_SECRET)) ||
      (!CRON_SECRET && process.env.NODE_ENV === 'development');

    // Para chamadas manuais do admin, verificar cookie
    let isAdminCall = false;
    const cookies = request.cookies;
    const authToken = cookies.get('auth-token')?.value;

    if (authToken) {
      const userResult = await pool.query(
        `SELECT role FROM users WHERE id = $1 AND role IN ('admin', 'gerente')`,
        [authToken]
      );
      isAdminCall = userResult.rows.length > 0;
    }

    if (!isAuthorized && !isAdminCall) {
      console.log('[Cron Plantões] Não autorizado');
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter data (hoje por padrão)
    let targetDate = new Date().toISOString().split('T')[0];

    try {
      const body = await request.json().catch(() => ({}));
      if (body.data && /^\d{4}-\d{2}-\d{2}$/.test(body.data)) {
        targetDate = body.data;
      }
    } catch {
      // Ignorar erro de parse
    }

    console.log(`[Cron Plantões] Criando plantões para ${targetDate}`);

    // Verificar se é feriado
    const feriadoCheck = await pool.query(
      `SELECT nome FROM recepcao_feriados WHERE data = $1`,
      [targetDate]
    );

    if (feriadoCheck.rows.length > 0) {
      const feriado = feriadoCheck.rows[0].nome;
      console.log(`[Cron Plantões] ${targetDate} é feriado: ${feriado}`);
      return NextResponse.json({
        success: true,
        data: targetDate,
        feriado,
        criados: 0,
        resultados: [],
        message: `Nenhum plantão criado - ${feriado}`,
      });
    }

    // Chamar função do banco que cria os plantões
    const result = await pool.query<CriacaoResult>(
      `SELECT * FROM criar_plantoes_automaticos($1::date)`,
      [targetDate]
    );

    const resultados = result.rows;
    const criados = resultados.filter((r) => r.sucesso).length;
    const ignorados = resultados.filter((r) => !r.sucesso).length;

    console.log(`[Cron Plantões] ${targetDate}: ${criados} criados, ${ignorados} ignorados`);

    // Log detalhado
    for (const r of resultados) {
      if (r.sucesso) {
        console.log(`[Cron Plantões] ✓ ${r.local_nome}: ${r.mensagem}`);
      } else {
        console.log(`[Cron Plantões] - ${r.local_nome}: ${r.mensagem}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: targetDate,
      criados,
      ignorados,
      resultados,
      message: criados > 0
        ? `${criados} plantão(ões) criado(s) automaticamente`
        : 'Nenhum plantão novo criado',
    });
  } catch (error: any) {
    console.error('[Cron Plantões] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao criar plantões' },
      { status: 500 }
    );
  }
}

// GET para verificar status e próximos plantões
export async function GET(request: NextRequest) {
  try {
    // Verificar se tem templates ativos
    const templatesResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_active) AS ativos,
        COUNT(*) AS total
      FROM recepcao_plantoes_recorrentes
    `);

    // Verificar plantões de hoje
    const hoje = new Date().toISOString().split('T')[0];
    const hojeResult = await pool.query(
      `SELECT COUNT(*) as total FROM recepcao_plantoes WHERE data = $1 AND status = 'ativo'`,
      [hoje]
    );

    // Próximos feriados
    const feriadosResult = await pool.query(`
      SELECT data, nome
      FROM recepcao_feriados
      WHERE data >= CURRENT_DATE
      ORDER BY data
      LIMIT 5
    `);

    return NextResponse.json({
      success: true,
      templates: {
        ativos: parseInt(templatesResult.rows[0]?.ativos || '0'),
        total: parseInt(templatesResult.rows[0]?.total || '0'),
      },
      hoje: {
        data: hoje,
        plantoes_ativos: parseInt(hojeResult.rows[0]?.total || '0'),
      },
      proximos_feriados: feriadosResult.rows,
    });
  } catch (error) {
    console.error('[Cron Plantões] Erro GET:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar status' },
      { status: 500 }
    );
  }
}
