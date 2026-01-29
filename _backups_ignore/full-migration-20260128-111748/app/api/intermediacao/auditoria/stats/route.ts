/**
 * API: Auditoria - Estatísticas
 *
 * GET /api/intermediacao/auditoria/stats - Estatísticas de auditoria
 * Retorna: total_operacoes, por_tipo, por_usuario, por_tabela, horarios_pico
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !["admin", "gerente", "auditor"].includes(user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas admin, gerente ou auditor podem acessar estatísticas de auditoria." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");

    // Construir filtro de data
    let whereDatas = "";
    const paramsBase: any[] = [];
    if (dataInicio) {
      paramsBase.push(dataInicio);
      whereDatas += ` AND created_at >= $${paramsBase.length}`;
    }
    if (dataFim) {
      paramsBase.push(dataFim + " 23:59:59");
      whereDatas += ` AND created_at <= $${paramsBase.length}`;
    }

    // Total de operacoes
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM log_auditoria
      WHERE 1=1 ${whereDatas}
    `;
    const totalResult = await dbQuery(totalQuery, paramsBase);
    const totalOperacoes = parseInt(totalResult.rows[0]?.total || "0");

    // Por tipo de operacao
    const porTipoQuery = `
      SELECT
        operacao,
        COUNT(*) as quantidade
      FROM log_auditoria
      WHERE 1=1 ${whereDatas}
      GROUP BY operacao
      ORDER BY quantidade DESC
    `;
    const porTipoResult = await dbQuery(porTipoQuery, paramsBase);

    // Por usuario (top 10)
    const porUsuarioQuery = `
      SELECT
        la.usuario_id,
        u.nome as usuario_nome,
        COUNT(*) as quantidade
      FROM log_auditoria la
      LEFT JOIN users u ON u.id = la.usuario_id
      WHERE 1=1 ${whereDatas}
      GROUP BY la.usuario_id, u.nome
      ORDER BY quantidade DESC
      LIMIT 10
    `;
    const porUsuarioResult = await dbQuery(porUsuarioQuery, paramsBase);

    // Por tabela
    const porTabelaQuery = `
      SELECT
        tabela,
        COUNT(*) as quantidade
      FROM log_auditoria
      WHERE 1=1 ${whereDatas}
      GROUP BY tabela
      ORDER BY quantidade DESC
    `;
    const porTabelaResult = await dbQuery(porTabelaQuery, paramsBase);

    // Horarios de pico (por hora do dia)
    const horariosPicoQuery = `
      SELECT
        EXTRACT(HOUR FROM created_at) as hora,
        COUNT(*) as quantidade
      FROM log_auditoria
      WHERE 1=1 ${whereDatas}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hora
    `;
    const horariosPicoResult = await dbQuery(horariosPicoQuery, paramsBase);

    // Evolucao diaria (ultimos 30 dias)
    const evolucaoDiariaQuery = `
      SELECT
        DATE_TRUNC('day', created_at) as data,
        COUNT(*) as quantidade
      FROM log_auditoria
      WHERE created_at >= NOW() - INTERVAL '30 days' ${whereDatas}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY data
    `;
    const evolucaoDiariaResult = await dbQuery(evolucaoDiariaQuery, paramsBase);

    // Operacoes por dia da semana
    const porDiaSemanaQuery = `
      SELECT
        EXTRACT(DOW FROM created_at) as dia_semana,
        COUNT(*) as quantidade
      FROM log_auditoria
      WHERE 1=1 ${whereDatas}
      GROUP BY EXTRACT(DOW FROM created_at)
      ORDER BY dia_semana
    `;
    const porDiaSemanaResult = await dbQuery(porDiaSemanaQuery, paramsBase);

    // Mapear dia da semana para nome
    const diasSemana = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

    return NextResponse.json({
      success: true,
      data: {
        total_operacoes: totalOperacoes,
        por_tipo: porTipoResult.rows.map(row => ({
          operacao: row.operacao,
          quantidade: parseInt(row.quantidade)
        })),
        por_usuario: porUsuarioResult.rows.map(row => ({
          usuario_id: row.usuario_id,
          usuario_nome: row.usuario_nome || "Usuario desconhecido",
          quantidade: parseInt(row.quantidade)
        })),
        por_tabela: porTabelaResult.rows.map(row => ({
          tabela: row.tabela,
          quantidade: parseInt(row.quantidade)
        })),
        horarios_pico: horariosPicoResult.rows.map(row => ({
          hora: parseInt(row.hora),
          hora_formatada: `${String(parseInt(row.hora)).padStart(2, "0")}:00`,
          quantidade: parseInt(row.quantidade)
        })),
        evolucao_diaria: evolucaoDiariaResult.rows.map(row => ({
          data: row.data,
          quantidade: parseInt(row.quantidade)
        })),
        por_dia_semana: porDiaSemanaResult.rows.map(row => ({
          dia_semana: parseInt(row.dia_semana),
          dia_nome: diasSemana[parseInt(row.dia_semana)],
          quantidade: parseInt(row.quantidade)
        }))
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar estatísticas de auditoria:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
