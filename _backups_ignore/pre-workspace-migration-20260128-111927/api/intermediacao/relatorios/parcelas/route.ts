/**
 * API: Relatórios - Parcelas
 *
 * GET /api/intermediacao/relatorios/parcelas - Relatório de parcelas
 * Query params: status, data_vencimento_inicio, data_vencimento_fim, beneficiario_id, formato (json|xlsx|pdf)
 * Inclui: totais, agrupamentos
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !["admin", "gerente", "financeiro", "auditor"].includes(user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Permissão insuficiente para gerar relatório de parcelas." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const dataVencimentoInicio = searchParams.get("data_vencimento_inicio");
    const dataVencimentoFim = searchParams.get("data_vencimento_fim");
    const beneficiarioId = searchParams.get("beneficiario_id");
    const formato = searchParams.get("formato") || "json";

    // Construir query dinamicamente
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      // Tratar status "atrasado" como parcelas pendentes vencidas
      if (status === "atrasado") {
        whereClause += ` AND (p.status = 'atrasado' OR (p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE))`;
      } else {
        whereClause += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
    }

    if (dataVencimentoInicio) {
      whereClause += ` AND p.data_vencimento >= $${paramIndex}`;
      params.push(dataVencimentoInicio);
      paramIndex++;
    }

    if (dataVencimentoFim) {
      whereClause += ` AND p.data_vencimento <= $${paramIndex}`;
      params.push(dataVencimentoFim);
      paramIndex++;
    }

    if (beneficiarioId) {
      whereClause += ` AND dc.beneficiario_id = $${paramIndex}`;
      params.push(beneficiarioId);
      paramIndex++;
    }

    // Query principal
    const query = `
      SELECT
        p.id,
        p.numero_parcela,
        p.valor,
        p.data_vencimento,
        p.status,
        p.data_pagamento,
        p.metodo_pagamento,
        p.comprovante_ref,
        dc.percentual,
        dc.valor_comissao as valor_total_comissao,
        b.id as beneficiario_id,
        b.nome as beneficiario_nome,
        b.cpf_cnpj as beneficiario_documento,
        v.id as venda_id,
        v.codigo as venda_codigo,
        v.valor_total as venda_valor,
        v.data_venda,
        v.cliente_nome,
        e.nome as empreendimento_nome,
        CASE
          WHEN p.status = 'pago' THEN 'pago'
          WHEN p.data_vencimento < CURRENT_DATE THEN 'atrasado'
          ELSE 'pendente'
        END as status_calculado,
        CASE
          WHEN p.status != 'pago' AND p.data_vencimento < CURRENT_DATE
          THEN CURRENT_DATE - p.data_vencimento
          ELSE 0
        END as dias_atraso
      FROM parcelas p
      INNER JOIN distribuicao_comissao dc ON dc.id = p.distribuicao_id
      INNER JOIN beneficiarios b ON b.id = dc.beneficiario_id
      INNER JOIN vendas v ON v.id = dc.venda_id
      LEFT JOIN empreendimentos e ON e.id = v.empreendimento_id
      ${whereClause}
      ORDER BY p.data_vencimento ASC, b.nome ASC
    `;

    const { rows } = await dbQuery(query, params);

    // Calcular totais
    const totais = calcularTotais(rows);

    // Agrupar parcelas
    const agrupamentos = {
      por_status: agruparPorStatus(rows),
      por_beneficiario: agruparPorBeneficiario(rows),
      por_mes_vencimento: agruparPorMesVencimento(rows),
      proximos_vencimentos: proximosVencimentos(rows)
    };

    // Formatar dados
    const parcelas = rows.map(row => ({
      id: row.id,
      numero_parcela: row.numero_parcela,
      valor: parseFloat(row.valor),
      data_vencimento: row.data_vencimento,
      status: row.status_calculado,
      dias_atraso: parseInt(row.dias_atraso) || 0,
      data_pagamento: row.data_pagamento,
      metodo_pagamento: row.metodo_pagamento,
      comprovante: row.comprovante_ref,
      beneficiario: {
        id: row.beneficiario_id,
        nome: row.beneficiario_nome,
        documento: row.beneficiario_documento
      },
      venda: {
        id: row.venda_id,
        codigo: row.venda_codigo,
        valor: parseFloat(row.venda_valor),
        data: row.data_venda,
        cliente: row.cliente_nome,
        empreendimento: row.empreendimento_nome
      },
      comissao: {
        percentual: parseFloat(row.percentual),
        valor_total: parseFloat(row.valor_total_comissao)
      }
    }));

    // Retornar no formato solicitado
    if (formato === "xlsx") {
      return gerarExcel(parcelas, totais, agrupamentos);
    }

    if (formato === "pdf") {
      return NextResponse.json({
        success: true,
        formato: "pdf_data",
        data: {
          titulo: "Relatório de Parcelas",
          periodo: {
            vencimento_inicio: dataVencimentoInicio || "Início",
            vencimento_fim: dataVencimentoFim || "Atual"
          },
          gerado_em: new Date().toISOString(),
          gerado_por: user.nome,
          parcelas,
          totais,
          agrupamentos
        }
      });
    }

    // Formato JSON (padrão)
    return NextResponse.json({
      success: true,
      data: {
        parcelas,
        totais,
        agrupamentos,
        filtros: {
          status,
          data_vencimento_inicio: dataVencimentoInicio,
          data_vencimento_fim: dataVencimentoFim,
          beneficiario_id: beneficiarioId
        },
        gerado_em: new Date().toISOString(),
        gerado_por: user.nome
      }
    });
  } catch (error: any) {
    console.error("Erro ao gerar relatório de parcelas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

function calcularTotais(rows: any[]) {
  const total = rows.length;
  const valorTotal = rows.reduce((sum, r) => sum + parseFloat(r.valor || 0), 0);

  const pagas = rows.filter(r => r.status_calculado === "pago");
  const pendentes = rows.filter(r => r.status_calculado === "pendente");
  const atrasadas = rows.filter(r => r.status_calculado === "atrasado");

  return {
    total_parcelas: total,
    valor_total: valorTotal,
    pagas: {
      quantidade: pagas.length,
      valor: pagas.reduce((sum, r) => sum + parseFloat(r.valor || 0), 0)
    },
    pendentes: {
      quantidade: pendentes.length,
      valor: pendentes.reduce((sum, r) => sum + parseFloat(r.valor || 0), 0)
    },
    atrasadas: {
      quantidade: atrasadas.length,
      valor: atrasadas.reduce((sum, r) => sum + parseFloat(r.valor || 0), 0),
      media_dias_atraso: atrasadas.length > 0
        ? atrasadas.reduce((sum, r) => sum + parseInt(r.dias_atraso || 0), 0) / atrasadas.length
        : 0
    }
  };
}

function agruparPorStatus(rows: any[]) {
  const grupos: Record<string, { quantidade: number; valor: number }> = {};

  rows.forEach(row => {
    const st = row.status_calculado;
    if (!grupos[st]) {
      grupos[st] = { quantidade: 0, valor: 0 };
    }
    grupos[st].quantidade++;
    grupos[st].valor += parseFloat(row.valor || 0);
  });

  return Object.entries(grupos).map(([status, dados]) => ({
    status,
    quantidade: dados.quantidade,
    valor: dados.valor
  }));
}

function agruparPorBeneficiario(rows: any[]) {
  const grupos: Record<string, { nome: string; quantidade: number; valor: number; valor_atrasado: number }> = {};

  rows.forEach(row => {
    const id = row.beneficiario_id;
    if (!grupos[id]) {
      grupos[id] = {
        nome: row.beneficiario_nome,
        quantidade: 0,
        valor: 0,
        valor_atrasado: 0
      };
    }
    grupos[id].quantidade++;
    grupos[id].valor += parseFloat(row.valor || 0);
    if (row.status_calculado === "atrasado") {
      grupos[id].valor_atrasado += parseFloat(row.valor || 0);
    }
  });

  return Object.entries(grupos)
    .map(([id, dados]) => ({
      beneficiario_id: id,
      beneficiario_nome: dados.nome,
      quantidade: dados.quantidade,
      valor_total: dados.valor,
      valor_atrasado: dados.valor_atrasado
    }))
    .sort((a, b) => b.valor_total - a.valor_total);
}

function agruparPorMesVencimento(rows: any[]) {
  const grupos: Record<string, { quantidade: number; valor: number }> = {};

  rows.forEach(row => {
    if (!row.data_vencimento) return;
    const data = new Date(row.data_vencimento);
    const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    if (!grupos[mesAno]) {
      grupos[mesAno] = { quantidade: 0, valor: 0 };
    }
    grupos[mesAno].quantidade++;
    grupos[mesAno].valor += parseFloat(row.valor || 0);
  });

  return Object.entries(grupos)
    .map(([mes, dados]) => ({
      mes,
      quantidade: dados.quantidade,
      valor: dados.valor
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

function proximosVencimentos(rows: any[]) {
  const hoje = new Date();
  const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
  const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

  const pendentes = rows.filter(r => r.status_calculado === "pendente");

  const proximos7 = pendentes.filter(r => {
    const venc = new Date(r.data_vencimento);
    return venc >= hoje && venc <= em7dias;
  });

  const proximos30 = pendentes.filter(r => {
    const venc = new Date(r.data_vencimento);
    return venc >= hoje && venc <= em30dias;
  });

  return {
    proximos_7_dias: {
      quantidade: proximos7.length,
      valor: proximos7.reduce((sum, r) => sum + parseFloat(r.valor || 0), 0)
    },
    proximos_30_dias: {
      quantidade: proximos30.length,
      valor: proximos30.reduce((sum, r) => sum + parseFloat(r.valor || 0), 0)
    }
  };
}

function gerarExcel(parcelas: any[], totais: any, agrupamentos: any): NextResponse {
  const wb = XLSX.utils.book_new();

  // Aba 1: Parcelas Detalhadas
  const dadosParcelas = parcelas.map(p => ({
    "Beneficiário": p.beneficiario.nome,
    "CPF/CNPJ": p.beneficiario.documento,
    "Código Venda": p.venda.codigo,
    "Cliente": p.venda.cliente,
    "Empreendimento": p.venda.empreendimento,
    "Parcela": p.numero_parcela,
    "Valor (R$)": p.valor,
    "Vencimento": p.data_vencimento ? new Date(p.data_vencimento).toLocaleDateString("pt-BR") : "",
    "Status": p.status,
    "Dias Atraso": p.dias_atraso,
    "Data Pagamento": p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString("pt-BR") : "",
    "Método": p.metodo_pagamento || ""
  }));

  const wsParcelas = XLSX.utils.json_to_sheet(dadosParcelas);
  wsParcelas["!cols"] = [
    { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 20 },
    { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 15 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsParcelas, "Parcelas");

  // Aba 2: Resumo
  const resumo = [
    { "Descrição": "Total de Parcelas", "Quantidade": totais.total_parcelas, "Valor (R$)": totais.valor_total },
    { "Descrição": "Pagas", "Quantidade": totais.pagas.quantidade, "Valor (R$)": totais.pagas.valor },
    { "Descrição": "Pendentes", "Quantidade": totais.pendentes.quantidade, "Valor (R$)": totais.pendentes.valor },
    { "Descrição": "Atrasadas", "Quantidade": totais.atrasadas.quantidade, "Valor (R$)": totais.atrasadas.valor },
    { "Descrição": "Média Dias Atraso", "Quantidade": "", "Valor (R$)": totais.atrasadas.media_dias_atraso.toFixed(1) + " dias" }
  ];
  const wsResumo = XLSX.utils.json_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // Aba 3: Por Beneficiário
  const porBenef = agrupamentos.por_beneficiario.map((b: any) => ({
    "Beneficiário": b.beneficiario_nome,
    "Quantidade": b.quantidade,
    "Valor Total (R$)": b.valor_total,
    "Valor Atrasado (R$)": b.valor_atrasado
  }));
  const wsBenef = XLSX.utils.json_to_sheet(porBenef);
  wsBenef["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsBenef, "Por Beneficiário");

  // Aba 4: Por Mês
  const porMes = agrupamentos.por_mes_vencimento.map((m: any) => ({
    "Mês": m.mes,
    "Quantidade": m.quantidade,
    "Valor (R$)": m.valor
  }));
  const wsMes = XLSX.utils.json_to_sheet(porMes);
  wsMes["!cols"] = [{ wch: 15 }, { wch: 15 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsMes, "Por Mês");

  // Gerar buffer
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `relatorio_parcelas_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
