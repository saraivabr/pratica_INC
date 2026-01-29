/**
 * API: Estatísticas de Beneficiários - Sistema de Intermediação Imobiliária
 *
 * GET /api/intermediacao/beneficiarios/stats - Estatísticas gerais
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

// ============================================================================
// GET - Estatísticas de Beneficiários
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    // Totais gerais
    const totaisQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN ativo = true THEN 1 END) as ativos,
        COUNT(CASE WHEN ativo = false THEN 1 END) as inativos
      FROM intermediacao_beneficiarios
      WHERE tenant_id = $1
    `;
    const totaisResult = await dbQuery(totaisQuery, [ctx.tenantId]);

    // Por cargo
    const porCargoQuery = `
      SELECT
        cargo,
        COUNT(*) as total,
        COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
      FROM intermediacao_beneficiarios
      WHERE tenant_id = $1
      GROUP BY cargo
      ORDER BY total DESC
    `;
    const porCargoResult = await dbQuery(porCargoQuery, [ctx.tenantId]);

    // Ranking de comissões (top 10)
    const rankingQuery = `
      SELECT
        b.id,
        b.codigo,
        b.nome,
        b.cargo,
        COUNT(DISTINCT c.venda_id) as total_vendas,
        COALESCE(SUM(c.valor), 0) as total_comissoes,
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' THEN p.valor ELSE 0 END), 0) as total_pendente
      FROM intermediacao_beneficiarios b
      LEFT JOIN intermediacao_comissoes c ON c.beneficiario_id = b.id AND c.tenant_id = $1
      LEFT JOIN intermediacao_parcelas p ON p.comissao_id = c.id
      WHERE b.ativo = true AND b.tenant_id = $1
      GROUP BY b.id, b.codigo, b.nome, b.cargo
      HAVING COALESCE(SUM(c.valor), 0) > 0
      ORDER BY total_comissoes DESC
      LIMIT 10
    `;
    const rankingResult = await dbQuery(rankingQuery, [ctx.tenantId]);

    // Estatísticas de comissões
    const comissoesStatsQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as total_geral_pago,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_geral_vencido,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_geral_a_vencer,
        COUNT(DISTINCT CASE WHEN p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE THEN c.beneficiario_id END) as beneficiarios_com_vencidos,
        AVG(c.valor) as media_comissao_por_venda
      FROM intermediacao_comissoes c
      LEFT JOIN intermediacao_parcelas p ON p.comissao_id = c.id
      WHERE c.tenant_id = $1
    `;
    const comissoesStatsResult = await dbQuery(comissoesStatsQuery, [ctx.tenantId]);

    // Novos beneficiários por mês (últimos 6 meses)
    const novosPorMesQuery = `
      SELECT
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as total
      FROM intermediacao_beneficiarios
      WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes DESC
    `;
    const novosPorMesResult = await dbQuery(novosPorMesQuery, [ctx.tenantId]);

    // Beneficiários sem comissões recentes (últimos 90 dias)
    const semComissoesRecentesQuery = `
      SELECT COUNT(*) as total
      FROM intermediacao_beneficiarios b
      WHERE b.tenant_id = $1 AND b.ativo = true
      AND NOT EXISTS (
        SELECT 1 FROM intermediacao_comissoes c
        WHERE c.beneficiario_id = b.id
        AND c.tenant_id = $1
        AND c.created_at >= CURRENT_DATE - INTERVAL '90 days'
      )
    `;
    const semComissoesRecentesResult = await dbQuery(semComissoesRecentesQuery, [ctx.tenantId]);

    // Por tipo de documento
    const porTipoDocumentoQuery = `
      SELECT
        tipo_documento,
        COUNT(*) as total
      FROM intermediacao_beneficiarios
      WHERE tenant_id = $1
      GROUP BY tipo_documento
    `;
    const porTipoDocumentoResult = await dbQuery(porTipoDocumentoQuery, [ctx.tenantId]);

    const totais = totaisResult.rows[0];
    const comissoesStats = comissoesStatsResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        totais: {
          total: parseInt(totais?.total || "0"),
          ativos: parseInt(totais?.ativos || "0"),
          inativos: parseInt(totais?.inativos || "0"),
        },
        por_cargo: porCargoResult.rows.map((row) => ({
          cargo: row.cargo,
          total: parseInt(row.total),
          ativos: parseInt(row.ativos),
        })),
        por_tipo_documento: porTipoDocumentoResult.rows.map((row) => ({
          tipo: row.tipo_documento,
          total: parseInt(row.total),
        })),
        ranking_comissoes: rankingResult.rows.map((row, index) => ({
          posicao: index + 1,
          id: row.id,
          codigo: row.codigo,
          nome: row.nome,
          cargo: row.cargo,
          total_vendas: parseInt(row.total_vendas),
          total_comissoes: parseFloat(row.total_comissoes),
          total_pago: parseFloat(row.total_pago),
          total_pendente: parseFloat(row.total_pendente),
        })),
        comissoes: {
          total_geral_pago: parseFloat(comissoesStats?.total_geral_pago || "0"),
          total_geral_vencido: parseFloat(comissoesStats?.total_geral_vencido || "0"),
          total_geral_a_vencer: parseFloat(comissoesStats?.total_geral_a_vencer || "0"),
          beneficiarios_com_vencidos: parseInt(comissoesStats?.beneficiarios_com_vencidos || "0"),
          media_comissao_por_venda: parseFloat(comissoesStats?.media_comissao_por_venda || "0"),
        },
        novos_por_mes: novosPorMesResult.rows.map((row) => ({
          mes: row.mes,
          total: parseInt(row.total),
        })),
        alertas: {
          sem_comissoes_recentes: parseInt(semComissoesRecentesResult.rows[0]?.total || "0"),
        },
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar estatísticas de beneficiários:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
