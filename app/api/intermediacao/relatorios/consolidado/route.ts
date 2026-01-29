/**
 * API: Relatórios - Dashboard Consolidado
 *
 * GET /api/intermediacao/relatorios/consolidado - Dados consolidados para dashboard
 * Query params: periodo (7d, 30d, 90d, 12m, custom), data_inicio, data_fim
 * Retorna: total_vendas, total_comissoes, total_pago, total_pendente, total_em_atraso,
 *          evolucao_mensal, por_empreendimento, por_beneficiario (top 10)
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !["admin", "gerente", "financeiro", "auditor"].includes(user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Permissão insuficiente para acessar dashboard consolidado." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "30d";
    let dataInicio = searchParams.get("data_inicio");
    let dataFim = searchParams.get("data_fim");

    // Calcular datas baseado no período
    const hoje = new Date();
    if (!dataInicio || !dataFim) {
      switch (periodo) {
        case "7d":
          dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          dataFim = hoje.toISOString().split("T")[0];
          break;
        case "30d":
          dataInicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          dataFim = hoje.toISOString().split("T")[0];
          break;
        case "90d":
          dataInicio = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          dataFim = hoje.toISOString().split("T")[0];
          break;
        case "12m":
          dataInicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate()).toISOString().split("T")[0];
          dataFim = hoje.toISOString().split("T")[0];
          break;
        default:
          // Se não for período válido e não tiver datas, usar 30 dias
          dataInicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          dataFim = hoje.toISOString().split("T")[0];
      }
    }

    // 1. Total de vendas no período
    const vendasQuery = `
      SELECT
        COUNT(*) as total_vendas,
        COALESCE(SUM(valor_total), 0) as valor_total_vendas,
        COALESCE(SUM(valor_comissao), 0) as total_comissoes
      FROM vendas
      WHERE data_venda >= $1 AND data_venda <= $2
    `;
    const vendasResult = await dbQuery(vendasQuery, [dataInicio, dataFim]);
    const vendasData = vendasResult.rows[0];

    // 2. Total pago, pendente e em atraso (parcelas)
    const parcelasQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_pendente,
        COALESCE(SUM(CASE WHEN p.status != 'pago' AND p.data_vencimento < CURRENT_DATE THEN p.valor ELSE 0 END), 0) as total_em_atraso,
        COUNT(CASE WHEN p.status = 'pago' THEN 1 END) as parcelas_pagas,
        COUNT(CASE WHEN p.status = 'pendente' AND p.data_vencimento >= CURRENT_DATE THEN 1 END) as parcelas_pendentes,
        COUNT(CASE WHEN p.status != 'pago' AND p.data_vencimento < CURRENT_DATE THEN 1 END) as parcelas_atrasadas
      FROM parcelas p
      INNER JOIN distribuicao_comissao dc ON dc.id = p.distribuicao_id
      INNER JOIN vendas v ON v.id = dc.venda_id
      WHERE v.data_venda >= $1 AND v.data_venda <= $2
    `;
    const parcelasResult = await dbQuery(parcelasQuery, [dataInicio, dataFim]);
    const parcelasData = parcelasResult.rows[0];

    // 3. Evolução mensal (últimos 12 meses ou período selecionado)
    const evolucaoQuery = `
      SELECT
        DATE_TRUNC('month', v.data_venda) as mes,
        COUNT(DISTINCT v.id) as vendas,
        COALESCE(SUM(v.valor_total), 0) as valor_vendas,
        COALESCE(SUM(v.valor_comissao), 0) as valor_comissoes,
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as valor_pago
      FROM vendas v
      LEFT JOIN distribuicao_comissao dc ON dc.venda_id = v.id
      LEFT JOIN parcelas p ON p.distribuicao_id = dc.id
      WHERE v.data_venda >= $1 AND v.data_venda <= $2
      GROUP BY DATE_TRUNC('month', v.data_venda)
      ORDER BY mes ASC
    `;
    const evolucaoResult = await dbQuery(evolucaoQuery, [dataInicio, dataFim]);

    // 4. Por empreendimento
    const empreendimentoQuery = `
      SELECT
        COALESCE(e.nome, 'Sem empreendimento') as empreendimento,
        COUNT(v.id) as vendas,
        COALESCE(SUM(v.valor_total), 0) as valor_total,
        COALESCE(SUM(v.valor_comissao), 0) as valor_comissao
      FROM vendas v
      LEFT JOIN empreendimentos e ON e.id = v.empreendimento_id
      WHERE v.data_venda >= $1 AND v.data_venda <= $2
      GROUP BY e.nome
      ORDER BY valor_total DESC
      LIMIT 10
    `;
    const empreendimentoResult = await dbQuery(empreendimentoQuery, [dataInicio, dataFim]);

    // 5. Por beneficiário (top 10)
    const beneficiarioQuery = `
      SELECT
        b.id,
        b.nome,
        b.cargo,
        COUNT(DISTINCT v.id) as vendas,
        COALESCE(SUM(dc.valor_comissao), 0) as valor_comissao,
        COALESCE(SUM(CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END), 0) as valor_pago,
        COALESCE(SUM(CASE WHEN p.status != 'pago' THEN p.valor ELSE 0 END), 0) as valor_pendente
      FROM beneficiarios b
      INNER JOIN distribuicao_comissao dc ON dc.beneficiario_id = b.id
      INNER JOIN vendas v ON v.id = dc.venda_id
      LEFT JOIN parcelas p ON p.distribuicao_id = dc.id
      WHERE v.data_venda >= $1 AND v.data_venda <= $2
      GROUP BY b.id, b.nome, b.cargo
      ORDER BY valor_comissao DESC
      LIMIT 10
    `;
    const beneficiarioResult = await dbQuery(beneficiarioQuery, [dataInicio, dataFim]);

    // 6. Vendas por status
    const statusVendasQuery = `
      SELECT
        status,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor_total), 0) as valor
      FROM vendas
      WHERE data_venda >= $1 AND data_venda <= $2
      GROUP BY status
    `;
    const statusVendasResult = await dbQuery(statusVendasQuery, [dataInicio, dataFim]);

    // 7. Comparativo com período anterior
    const diasPeriodo = Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24));
    const dataInicioAnterior = new Date(new Date(dataInicio).getTime() - diasPeriodo * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dataFimAnterior = new Date(new Date(dataInicio).getTime() - 1).toISOString().split("T")[0];

    const comparativoQuery = `
      SELECT
        COUNT(*) as total_vendas,
        COALESCE(SUM(valor_total), 0) as valor_total_vendas,
        COALESCE(SUM(valor_comissao), 0) as total_comissoes
      FROM vendas
      WHERE data_venda >= $1 AND data_venda <= $2
    `;
    const comparativoResult = await dbQuery(comparativoQuery, [dataInicioAnterior, dataFimAnterior]);
    const comparativoData = comparativoResult.rows[0];

    // Calcular variações percentuais
    const calcularVariacao = (atual: number, anterior: number) => {
      if (anterior === 0) return atual > 0 ? 100 : 0;
      return ((atual - anterior) / anterior) * 100;
    };

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          tipo: periodo,
          data_inicio: dataInicio,
          data_fim: dataFim
        },
        resumo: {
          total_vendas: parseInt(vendasData.total_vendas) || 0,
          valor_total_vendas: parseFloat(vendasData.valor_total_vendas) || 0,
          total_comissoes: parseFloat(vendasData.total_comissoes) || 0,
          total_pago: parseFloat(parcelasData.total_pago) || 0,
          total_pendente: parseFloat(parcelasData.total_pendente) || 0,
          total_em_atraso: parseFloat(parcelasData.total_em_atraso) || 0,
          parcelas: {
            pagas: parseInt(parcelasData.parcelas_pagas) || 0,
            pendentes: parseInt(parcelasData.parcelas_pendentes) || 0,
            atrasadas: parseInt(parcelasData.parcelas_atrasadas) || 0
          }
        },
        comparativo_periodo_anterior: {
          periodo_anterior: {
            data_inicio: dataInicioAnterior,
            data_fim: dataFimAnterior
          },
          total_vendas_anterior: parseInt(comparativoData.total_vendas) || 0,
          valor_vendas_anterior: parseFloat(comparativoData.valor_total_vendas) || 0,
          total_comissoes_anterior: parseFloat(comparativoData.total_comissoes) || 0,
          variacao: {
            vendas: calcularVariacao(
              parseInt(vendasData.total_vendas) || 0,
              parseInt(comparativoData.total_vendas) || 0
            ),
            valor: calcularVariacao(
              parseFloat(vendasData.valor_total_vendas) || 0,
              parseFloat(comparativoData.valor_total_vendas) || 0
            ),
            comissoes: calcularVariacao(
              parseFloat(vendasData.total_comissoes) || 0,
              parseFloat(comparativoData.total_comissoes) || 0
            )
          }
        },
        evolucao_mensal: evolucaoResult.rows.map(row => ({
          mes: row.mes,
          mes_formatado: formatarMes(row.mes),
          vendas: parseInt(row.vendas) || 0,
          valor_vendas: parseFloat(row.valor_vendas) || 0,
          valor_comissoes: parseFloat(row.valor_comissoes) || 0,
          valor_pago: parseFloat(row.valor_pago) || 0
        })),
        por_empreendimento: empreendimentoResult.rows.map(row => ({
          empreendimento: row.empreendimento,
          vendas: parseInt(row.vendas) || 0,
          valor_total: parseFloat(row.valor_total) || 0,
          valor_comissao: parseFloat(row.valor_comissao) || 0
        })),
        por_beneficiario: beneficiarioResult.rows.map(row => ({
          id: row.id,
          nome: row.nome,
          cargo: row.cargo,
          vendas: parseInt(row.vendas) || 0,
          valor_comissao: parseFloat(row.valor_comissao) || 0,
          valor_pago: parseFloat(row.valor_pago) || 0,
          valor_pendente: parseFloat(row.valor_pendente) || 0
        })),
        por_status: statusVendasResult.rows.map(row => ({
          status: row.status,
          quantidade: parseInt(row.quantidade) || 0,
          valor: parseFloat(row.valor) || 0
        })),
        gerado_em: new Date().toISOString(),
        gerado_por: user.nome
      }
    });
  } catch (error: any) {
    console.error("Erro ao gerar dashboard consolidado:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

function formatarMes(data: string | Date): string {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const d = new Date(data);
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}
