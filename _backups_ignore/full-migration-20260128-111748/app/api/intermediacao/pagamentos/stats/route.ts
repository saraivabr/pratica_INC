/**
 * API: Estatisticas de Pagamentos
 *
 * GET /api/intermediacao/pagamentos/stats - Estatisticas de pagamentos
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const data_inicio = searchParams.get("data_inicio");
    const data_fim = searchParams.get("data_fim");

    // Default: ultimos 12 meses
    const now = new Date();
    const defaultInicio = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const defaultFim = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const inicio = data_inicio || defaultInicio.toISOString().split('T')[0];
    const fim = data_fim || defaultFim.toISOString().split('T')[0];

    // 1. Total pago no periodo - filter by tenant_id
    const totalPeriodoResult = await dbQuery(
      `SELECT
        COUNT(*) as quantidade,
        COALESCE(SUM(valor), 0) as total
       FROM pagamentos_intermediacao
       WHERE tenant_id = $1 AND data_pagamento >= $2 AND data_pagamento <= $3`,
      [ctx.tenantId, inicio, fim]
    );

    const totalPeriodo = {
      quantidade: parseInt(totalPeriodoResult.rows[0]?.quantidade || "0"),
      valor: parseFloat(totalPeriodoResult.rows[0]?.total || "0")
    };

    // 2. Pagamentos por metodo - filter by tenant_id
    const porMetodoResult = await dbQuery(
      `SELECT
        metodo,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor), 0) as total
       FROM pagamentos_intermediacao
       WHERE tenant_id = $1 AND data_pagamento >= $2 AND data_pagamento <= $3
       GROUP BY metodo
       ORDER BY total DESC`,
      [ctx.tenantId, inicio, fim]
    );

    const porMetodo = porMetodoResult.rows.map(row => ({
      metodo: row.metodo,
      quantidade: parseInt(row.quantidade),
      valor: parseFloat(row.total),
      percentual: totalPeriodo.valor > 0
        ? Math.round((parseFloat(row.total) / totalPeriodo.valor) * 10000) / 100
        : 0
    }));

    // 3. Pagamentos por beneficiario (top 10) - filter by tenant_id
    const porBeneficiarioResult = await dbQuery(
      `SELECT
        b.id,
        b.nome,
        b.cargo,
        COUNT(pg.*) as quantidade,
        COALESCE(SUM(pg.valor), 0) as total
       FROM pagamentos_intermediacao pg
       LEFT JOIN beneficiarios_intermediacao b ON b.id = pg.beneficiario_id
       WHERE pg.tenant_id = $1 AND pg.data_pagamento >= $2 AND pg.data_pagamento <= $3
       GROUP BY b.id, b.nome, b.cargo
       ORDER BY total DESC
       LIMIT 10`,
      [ctx.tenantId, inicio, fim]
    );

    const porBeneficiario = porBeneficiarioResult.rows.map(row => ({
      id: row.id,
      nome: row.nome,
      cargo: row.cargo,
      quantidade: parseInt(row.quantidade),
      valor: parseFloat(row.total),
      percentual: totalPeriodo.valor > 0
        ? Math.round((parseFloat(row.total) / totalPeriodo.valor) * 10000) / 100
        : 0
    }));

    // 4. Evolucao mensal - filter by tenant_id
    const evolucaoResult = await dbQuery(
      `SELECT
        TO_CHAR(data_pagamento, 'YYYY-MM') as mes,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor), 0) as total
       FROM pagamentos_intermediacao
       WHERE tenant_id = $1 AND data_pagamento >= $2 AND data_pagamento <= $3
       GROUP BY TO_CHAR(data_pagamento, 'YYYY-MM')
       ORDER BY mes ASC`,
      [ctx.tenantId, inicio, fim]
    );

    const evolucaoMensal = evolucaoResult.rows.map(row => ({
      mes: row.mes,
      quantidade: parseInt(row.quantidade),
      valor: parseFloat(row.total)
    }));

    // 5. Estatisticas de parcelas - filter by tenant_id
    const parcelasStatsResult = await dbQuery(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'paga') as pagas,
        COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
        COUNT(*) FILTER (WHERE status != 'paga' AND status != 'cancelada' AND data_vencimento < CURRENT_DATE) as vencidas,
        COUNT(*) FILTER (WHERE status = 'cancelada') as canceladas,
        COALESCE(SUM(valor) FILTER (WHERE status = 'paga'), 0) as valor_pago,
        COALESCE(SUM(valor) FILTER (WHERE status = 'pendente'), 0) as valor_pendente,
        COALESCE(SUM(valor) FILTER (WHERE status != 'paga' AND status != 'cancelada' AND data_vencimento < CURRENT_DATE), 0) as valor_vencido
       FROM parcelas_intermediacao
       WHERE tenant_id = $1`,
      [ctx.tenantId]
    );

    const parcelasStats = {
      pagas: parseInt(parcelasStatsResult.rows[0]?.pagas || "0"),
      pendentes: parseInt(parcelasStatsResult.rows[0]?.pendentes || "0"),
      vencidas: parseInt(parcelasStatsResult.rows[0]?.vencidas || "0"),
      canceladas: parseInt(parcelasStatsResult.rows[0]?.canceladas || "0"),
      valor_pago: parseFloat(parcelasStatsResult.rows[0]?.valor_pago || "0"),
      valor_pendente: parseFloat(parcelasStatsResult.rows[0]?.valor_pendente || "0"),
      valor_vencido: parseFloat(parcelasStatsResult.rows[0]?.valor_vencido || "0")
    };

    // 6. Proximos vencimentos (7 dias) - filter by tenant_id
    const proximosVencimentosResult = await dbQuery(
      `SELECT
        COUNT(*) as quantidade,
        COALESCE(SUM(valor), 0) as total
       FROM parcelas_intermediacao
       WHERE tenant_id = $1
       AND status NOT IN ('paga', 'cancelada')
       AND data_vencimento >= CURRENT_DATE
       AND data_vencimento <= CURRENT_DATE + INTERVAL '7 days'`,
      [ctx.tenantId]
    );

    const proximosVencimentos = {
      quantidade: parseInt(proximosVencimentosResult.rows[0]?.quantidade || "0"),
      valor: parseFloat(proximosVencimentosResult.rows[0]?.total || "0")
    };

    // 7. Media de dias para pagamento (pontualidade) - filter by tenant_id
    const pontualidadeResult = await dbQuery(
      `SELECT
        AVG(pg.data_pagamento - p.data_vencimento) as media_dias,
        COUNT(*) FILTER (WHERE pg.data_pagamento <= p.data_vencimento) as pagos_no_prazo,
        COUNT(*) FILTER (WHERE pg.data_pagamento > p.data_vencimento) as pagos_atrasados,
        COUNT(*) as total
       FROM pagamentos_intermediacao pg
       LEFT JOIN parcelas_intermediacao p ON p.id = pg.parcela_id
       WHERE pg.tenant_id = $1 AND pg.data_pagamento >= $2 AND pg.data_pagamento <= $3`,
      [ctx.tenantId, inicio, fim]
    );

    const pontualidade = {
      media_dias_para_pagamento: Math.round(parseFloat(pontualidadeResult.rows[0]?.media_dias || "0") * 10) / 10,
      pagos_no_prazo: parseInt(pontualidadeResult.rows[0]?.pagos_no_prazo || "0"),
      pagos_atrasados: parseInt(pontualidadeResult.rows[0]?.pagos_atrasados || "0"),
      taxa_pontualidade: pontualidadeResult.rows[0]?.total > 0
        ? Math.round((parseInt(pontualidadeResult.rows[0]?.pagos_no_prazo || "0") / parseInt(pontualidadeResult.rows[0]?.total || "1")) * 10000) / 100
        : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          inicio,
          fim
        },
        total_pago_periodo: totalPeriodo,
        por_metodo: porMetodo,
        por_beneficiario: porBeneficiario,
        evolucao_mensal: evolucaoMensal,
        parcelas: parcelasStats,
        proximos_vencimentos_7_dias: proximosVencimentos,
        pontualidade
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar estatisticas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
