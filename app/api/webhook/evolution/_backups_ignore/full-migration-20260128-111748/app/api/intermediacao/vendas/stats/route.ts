/**
 * API: Estatisticas de Vendas
 *
 * GET /api/intermediacao/vendas/stats - Obter estatisticas de vendas
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

/**
 * GET - Estatisticas de vendas
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);

    // Parametros opcionais de filtro de periodo
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");

    // Construir condicao de periodo - tenant_id sempre primeiro
    let periodoCondition = "";
    const periodoParams: any[] = [ctx.tenantId];
    let paramIndex = 2;

    if (dataInicio && dataFim) {
      periodoCondition = `AND data_venda BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      periodoParams.push(dataInicio, dataFim);
      paramIndex += 2;
    } else if (dataInicio) {
      periodoCondition = `AND data_venda >= $${paramIndex}`;
      periodoParams.push(dataInicio);
      paramIndex++;
    } else if (dataFim) {
      periodoCondition = `AND data_venda <= $${paramIndex}`;
      periodoParams.push(dataFim);
      paramIndex++;
    }

    // 1. Totais gerais
    const { rows: totaisRows } = await dbQuery(
      `SELECT
        COUNT(*) as total_vendas,
        COALESCE(SUM(valor_total), 0) as valor_total_vendas,
        COALESCE(SUM(valor_comissao), 0) as total_comissao,
        COALESCE(AVG(percentual_intermediacao), 0) as percentual_medio
      FROM im_vendas
      WHERE tenant_id = $1 ${periodoCondition}`,
      periodoParams
    );

    const totais = totaisRows[0];

    // 2. Por status
    const { rows: porStatus } = await dbQuery(
      `SELECT
        status,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor_total), 0) as valor_total,
        COALESCE(SUM(valor_comissao), 0) as comissao_total
      FROM im_vendas
      WHERE tenant_id = $1 ${periodoCondition}
      GROUP BY status
      ORDER BY quantidade DESC`,
      periodoParams
    );

    // 3. Por empreendimento
    const { rows: porEmpreendimento } = await dbQuery(
      `SELECT
        empreendimento,
        empreendimento_id,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor_total), 0) as valor_total,
        COALESCE(SUM(valor_comissao), 0) as comissao_total,
        COALESCE(AVG(percentual_intermediacao), 0) as percentual_medio
      FROM im_vendas
      WHERE tenant_id = $1 ${periodoCondition}
      GROUP BY empreendimento, empreendimento_id
      ORDER BY valor_total DESC
      LIMIT 10`,
      periodoParams
    );

    // 4. Por periodo (mensal)
    const { rows: porPeriodo } = await dbQuery(
      `SELECT
        DATE_TRUNC('month', data_venda) as mes,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor_total), 0) as valor_total,
        COALESCE(SUM(valor_comissao), 0) as comissao_total
      FROM im_vendas
      WHERE tenant_id = $1 AND data_venda IS NOT NULL ${periodoCondition}
      GROUP BY DATE_TRUNC('month', data_venda)
      ORDER BY mes DESC
      LIMIT 12`,
      periodoParams
    );

    // 5. Top beneficiarios
    const { rows: topBeneficiarios } = await dbQuery(
      `SELECT
        b.id,
        b.nome,
        b.tipo,
        COUNT(DISTINCT d.venda_id) as num_vendas,
        COALESCE(SUM(d.valor), 0) as valor_total,
        COALESCE(AVG(d.percentual), 0) as percentual_medio
      FROM im_distribuicao d
      JOIN im_beneficiarios b ON b.id = d.beneficiario_id
      JOIN im_vendas v ON v.id = d.venda_id
      WHERE v.tenant_id = $1 ${periodoCondition.replace(/data_venda/g, 'v.data_venda')}
      GROUP BY b.id, b.nome, b.tipo
      ORDER BY valor_total DESC
      LIMIT 10`,
      periodoParams
    );

    // 6. Parcelas e pagamentos
    const { rows: parcelasStats } = await dbQuery(
      `SELECT
        COUNT(*) as total_parcelas,
        COUNT(*) FILTER (WHERE p.status = 'pendente') as parcelas_pendentes,
        COUNT(*) FILTER (WHERE p.status = 'paga') as parcelas_pagas,
        COUNT(*) FILTER (WHERE p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE) as parcelas_vencidas,
        COALESCE(SUM(p.valor), 0) as valor_total_parcelas,
        COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'paga'), 0) as valor_pago,
        COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'pendente'), 0) as valor_pendente
      FROM im_parcelas p
      JOIN im_vendas v ON v.id = p.venda_id
      WHERE v.tenant_id = $1 ${periodoCondition.replace(/data_venda/g, 'v.data_venda')}`,
      periodoParams
    );

    // 7. Proximas parcelas a vencer (proximos 30 dias)
    const { rows: proximasParcelas } = await dbQuery(
      `SELECT
        p.id,
        p.numero,
        p.valor,
        p.data_vencimento,
        v.codigo as venda_codigo,
        b.nome as beneficiario_nome
      FROM im_parcelas p
      JOIN im_vendas v ON v.id = p.venda_id
      LEFT JOIN im_beneficiarios b ON b.id = p.beneficiario_id
      WHERE v.tenant_id = $1
        AND p.status = 'pendente'
        AND p.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY p.data_vencimento
      LIMIT 20`,
      [ctx.tenantId]
    );

    // 8. Parcelas vencidas
    const { rows: parcelasVencidas } = await dbQuery(
      `SELECT
        p.id,
        p.numero,
        p.valor,
        p.data_vencimento,
        CURRENT_DATE - p.data_vencimento as dias_atraso,
        v.codigo as venda_codigo,
        b.nome as beneficiario_nome
      FROM im_parcelas p
      JOIN im_vendas v ON v.id = p.venda_id
      LEFT JOIN im_beneficiarios b ON b.id = p.beneficiario_id
      WHERE v.tenant_id = $1
        AND p.status = 'pendente'
        AND p.data_vencimento < CURRENT_DATE
      ORDER BY p.data_vencimento
      LIMIT 20`,
      [ctx.tenantId]
    );

    // 9. Resumo por tipo de beneficiario
    const { rows: porTipoBeneficiario } = await dbQuery(
      `SELECT
        b.tipo,
        COUNT(DISTINCT b.id) as num_beneficiarios,
        COUNT(DISTINCT d.venda_id) as num_vendas,
        COALESCE(SUM(d.valor), 0) as valor_total
      FROM im_distribuicao d
      JOIN im_beneficiarios b ON b.id = d.beneficiario_id
      JOIN im_vendas v ON v.id = d.venda_id
      WHERE v.tenant_id = $1 ${periodoCondition.replace(/data_venda/g, 'v.data_venda')}
      GROUP BY b.tipo
      ORDER BY valor_total DESC`,
      periodoParams
    );

    // 10. Comparativo com periodo anterior
    let comparativo = null;
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);
      const duracao = fim.getTime() - inicio.getTime();

      const inicioAnterior = new Date(inicio.getTime() - duracao);
      const fimAnterior = new Date(inicio.getTime() - 1);

      const { rows: periodoAnterior } = await dbQuery(
        `SELECT
          COUNT(*) as total_vendas,
          COALESCE(SUM(valor_total), 0) as valor_total_vendas,
          COALESCE(SUM(valor_comissao), 0) as total_comissao
        FROM im_vendas
        WHERE tenant_id = $1 AND data_venda BETWEEN $2 AND $3`,
        [ctx.tenantId, inicioAnterior.toISOString().split('T')[0], fimAnterior.toISOString().split('T')[0]]
      );

      const anterior = periodoAnterior[0];

      comparativo = {
        periodo_anterior: {
          inicio: inicioAnterior.toISOString().split('T')[0],
          fim: fimAnterior.toISOString().split('T')[0],
        },
        vendas: {
          atual: parseInt(totais.total_vendas),
          anterior: parseInt(anterior.total_vendas),
          variacao: parseInt(anterior.total_vendas) > 0
            ? ((parseInt(totais.total_vendas) - parseInt(anterior.total_vendas)) / parseInt(anterior.total_vendas) * 100).toFixed(1)
            : null,
        },
        valor_total: {
          atual: parseFloat(totais.valor_total_vendas),
          anterior: parseFloat(anterior.valor_total_vendas),
          variacao: parseFloat(anterior.valor_total_vendas) > 0
            ? ((parseFloat(totais.valor_total_vendas) - parseFloat(anterior.valor_total_vendas)) / parseFloat(anterior.valor_total_vendas) * 100).toFixed(1)
            : null,
        },
        comissao: {
          atual: parseFloat(totais.total_comissao),
          anterior: parseFloat(anterior.total_comissao),
          variacao: parseFloat(anterior.total_comissao) > 0
            ? ((parseFloat(totais.total_comissao) - parseFloat(anterior.total_comissao)) / parseFloat(anterior.total_comissao) * 100).toFixed(1)
            : null,
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        totais: {
          total_vendas: parseInt(totais.total_vendas),
          valor_total_vendas: parseFloat(totais.valor_total_vendas),
          total_comissao: parseFloat(totais.total_comissao),
          percentual_medio: parseFloat(totais.percentual_medio),
        },
        por_status: porStatus.map(s => ({
          status: s.status,
          quantidade: parseInt(s.quantidade),
          valor_total: parseFloat(s.valor_total),
          comissao_total: parseFloat(s.comissao_total),
        })),
        por_empreendimento: porEmpreendimento.map(e => ({
          empreendimento: e.empreendimento,
          empreendimento_id: e.empreendimento_id,
          quantidade: parseInt(e.quantidade),
          valor_total: parseFloat(e.valor_total),
          comissao_total: parseFloat(e.comissao_total),
          percentual_medio: parseFloat(e.percentual_medio),
        })),
        por_periodo: porPeriodo.map(p => ({
          mes: p.mes,
          quantidade: parseInt(p.quantidade),
          valor_total: parseFloat(p.valor_total),
          comissao_total: parseFloat(p.comissao_total),
        })),
        top_beneficiarios: topBeneficiarios.map(b => ({
          id: b.id,
          nome: b.nome,
          tipo: b.tipo,
          num_vendas: parseInt(b.num_vendas),
          valor_total: parseFloat(b.valor_total),
          percentual_medio: parseFloat(b.percentual_medio),
        })),
        parcelas: {
          total: parseInt(parcelasStats[0].total_parcelas),
          pendentes: parseInt(parcelasStats[0].parcelas_pendentes),
          pagas: parseInt(parcelasStats[0].parcelas_pagas),
          vencidas: parseInt(parcelasStats[0].parcelas_vencidas),
          valor_total: parseFloat(parcelasStats[0].valor_total_parcelas),
          valor_pago: parseFloat(parcelasStats[0].valor_pago),
          valor_pendente: parseFloat(parcelasStats[0].valor_pendente),
        },
        proximas_parcelas: proximasParcelas,
        parcelas_vencidas: parcelasVencidas,
        por_tipo_beneficiario: porTipoBeneficiario.map(t => ({
          tipo: t.tipo,
          num_beneficiarios: parseInt(t.num_beneficiarios),
          num_vendas: parseInt(t.num_vendas),
          valor_total: parseFloat(t.valor_total),
        })),
        comparativo,
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar estatisticas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
