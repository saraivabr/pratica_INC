/**
 * API: Calendario de Vencimentos
 *
 * GET /api/intermediacao/parcelas/calendario - Vencimentos por periodo agrupados por dia
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireTenantContext } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const mes = parseInt(searchParams.get("mes") || String(new Date().getMonth() + 1));
    const ano = parseInt(searchParams.get("ano") || String(new Date().getFullYear()));
    const beneficiario_id = searchParams.get("beneficiario_id");
    const incluir_pagas = searchParams.get("incluir_pagas") === "true";

    // Validar mes e ano
    if (mes < 1 || mes > 12) {
      return NextResponse.json(
        { success: false, error: "Mes invalido (1-12)" },
        { status: 400 }
      );
    }

    if (ano < 2020 || ano > 2100) {
      return NextResponse.json(
        { success: false, error: "Ano invalido" },
        { status: 400 }
      );
    }

    // Calcular primeiro e ultimo dia do mes
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);

    // Build where conditions - always filter by tenant_id
    let whereConditions = [
      `p.tenant_id = $1`,
      `p.data_vencimento >= $2`,
      `p.data_vencimento <= $3`
    ];
    const params: any[] = [
      ctx.tenantId,
      primeiroDia.toISOString().split('T')[0],
      ultimoDia.toISOString().split('T')[0]
    ];
    let paramIndex = 4;

    if (!incluir_pagas) {
      whereConditions.push(`p.status != 'cancelada'`);
    }

    if (beneficiario_id) {
      whereConditions.push(`p.beneficiario_id = $${paramIndex}`);
      params.push(beneficiario_id);
      paramIndex++;
    }

    const whereClause = whereConditions.join(" AND ");

    // Buscar parcelas agrupadas por dia
    const query = `
      SELECT
        DATE(p.data_vencimento) as dia,
        COUNT(*) as quantidade,
        SUM(p.valor) as valor_total,
        SUM(CASE WHEN p.status = 'paga' THEN p.valor ELSE 0 END) as valor_pago,
        SUM(CASE WHEN p.status != 'paga' THEN p.valor ELSE 0 END) as valor_pendente,
        COUNT(CASE WHEN p.status = 'paga' THEN 1 END) as quantidade_paga,
        COUNT(CASE WHEN p.status != 'paga' THEN 1 END) as quantidade_pendente
      FROM parcelas_intermediacao p
      WHERE ${whereClause}
      GROUP BY DATE(p.data_vencimento)
      ORDER BY dia ASC
    `;

    const result = await dbQuery(query, params);

    // Buscar detalhes das parcelas
    const detalhesQuery = `
      SELECT
        p.id,
        p.numero_parcela,
        p.valor,
        p.data_vencimento,
        p.status,
        b.id as beneficiario_id,
        b.nome as beneficiario_nome,
        v.id as venda_id,
        v.cliente_nome,
        v.empreendimento
      FROM parcelas_intermediacao p
      LEFT JOIN beneficiarios_intermediacao b ON b.id = p.beneficiario_id
      LEFT JOIN vendas_intermediacao v ON v.id = p.venda_id
      WHERE ${whereClause}
      ORDER BY p.data_vencimento ASC, p.valor DESC
    `;

    const detalhesResult = await dbQuery(detalhesQuery, params);

    // Agrupar por dia
    const calendarioMap = new Map<string, any>();

    // Inicializar com dados agregados
    result.rows.forEach(row => {
      const diaStr = row.dia instanceof Date
        ? row.dia.toISOString().split('T')[0]
        : String(row.dia).split('T')[0];

      calendarioMap.set(diaStr, {
        dia: diaStr,
        quantidade: parseInt(row.quantidade),
        valor_total: parseFloat(row.valor_total),
        valor_pago: parseFloat(row.valor_pago),
        valor_pendente: parseFloat(row.valor_pendente),
        quantidade_paga: parseInt(row.quantidade_paga),
        quantidade_pendente: parseInt(row.quantidade_pendente),
        parcelas: []
      });
    });

    // Adicionar detalhes das parcelas
    detalhesResult.rows.forEach(row => {
      const diaStr = row.data_vencimento instanceof Date
        ? row.data_vencimento.toISOString().split('T')[0]
        : String(row.data_vencimento).split('T')[0];

      const diaData = calendarioMap.get(diaStr);
      if (diaData) {
        diaData.parcelas.push({
          id: row.id,
          numero_parcela: row.numero_parcela,
          valor: parseFloat(row.valor),
          status: row.status,
          beneficiario: {
            id: row.beneficiario_id,
            nome: row.beneficiario_nome
          },
          venda: {
            id: row.venda_id,
            cliente_nome: row.cliente_nome,
            empreendimento: row.empreendimento
          }
        });
      }
    });

    // Converter para array
    const calendario = Array.from(calendarioMap.values());

    // Calcular totais do mes
    const totaisMes = {
      quantidade_total: calendario.reduce((acc, d) => acc + d.quantidade, 0),
      valor_total: calendario.reduce((acc, d) => acc + d.valor_total, 0),
      valor_pago: calendario.reduce((acc, d) => acc + d.valor_pago, 0),
      valor_pendente: calendario.reduce((acc, d) => acc + d.valor_pendente, 0),
      quantidade_paga: calendario.reduce((acc, d) => acc + d.quantidade_paga, 0),
      quantidade_pendente: calendario.reduce((acc, d) => acc + d.quantidade_pendente, 0),
      dias_com_vencimento: calendario.length
    };

    return NextResponse.json({
      success: true,
      data: {
        mes,
        ano,
        periodo: {
          inicio: primeiroDia.toISOString().split('T')[0],
          fim: ultimoDia.toISOString().split('T')[0]
        },
        totais: totaisMes,
        calendario
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar calendario:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
