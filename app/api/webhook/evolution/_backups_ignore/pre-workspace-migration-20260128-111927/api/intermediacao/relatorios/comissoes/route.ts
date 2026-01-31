/**
 * API: Relatórios - Comissões
 *
 * GET /api/intermediacao/relatorios/comissoes - Relatório de comissões por beneficiário
 * Query params: beneficiario_id, data_inicio, data_fim, formato (json|xlsx|pdf)
 * Inclui: detalhamento de cada venda, parcelas, pagamentos
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
        { success: false, error: "Acesso negado. Permissão insuficiente para gerar relatório de comissões." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const beneficiarioId = searchParams.get("beneficiario_id");
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");
    const formato = searchParams.get("formato") || "json";

    // Construir query de comissões
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

    if (beneficiarioId) {
      whereClause += ` AND dc.beneficiario_id = $${paramIndex}`;
      params.push(beneficiarioId);
      paramIndex++;
    }

    if (dataInicio) {
      whereClause += ` AND v.data_venda >= $${paramIndex}`;
      params.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      whereClause += ` AND v.data_venda <= $${paramIndex}`;
      params.push(dataFim);
      paramIndex++;
    }

    // Query principal - Comissões por beneficiário
    const comissoesQuery = `
      SELECT
        b.id as beneficiario_id,
        b.nome as beneficiario_nome,
        b.cpf_cnpj as beneficiario_documento,
        b.cargo,
        b.email,
        dc.id as distribuicao_id,
        dc.percentual,
        dc.valor_comissao,
        v.id as venda_id,
        v.codigo as venda_codigo,
        v.valor_total as venda_valor,
        v.data_venda,
        v.status as venda_status,
        v.cliente_nome,
        v.unidade,
        e.nome as empreendimento_nome
      FROM distribuicao_comissao dc
      INNER JOIN beneficiarios b ON b.id = dc.beneficiario_id
      INNER JOIN vendas v ON v.id = dc.venda_id
      LEFT JOIN empreendimentos e ON e.id = v.empreendimento_id
      ${whereClause}
      ORDER BY b.nome, v.data_venda DESC
    `;

    const comissoesResult = await dbQuery(comissoesQuery, params);

    // Buscar parcelas para cada distribuição
    const distribuicaoIds = comissoesResult.rows.map(r => r.distribuicao_id).filter(Boolean);

    let parcelasMap: Record<string, any[]> = {};
    if (distribuicaoIds.length > 0) {
      const parcelasQuery = `
        SELECT
          p.id,
          p.distribuicao_id,
          p.numero_parcela,
          p.valor,
          p.data_vencimento,
          p.status,
          p.data_pagamento,
          p.metodo_pagamento,
          p.comprovante_ref
        FROM parcelas p
        WHERE p.distribuicao_id = ANY($1::int[])
        ORDER BY p.distribuicao_id, p.numero_parcela
      `;
      const parcelasResult = await dbQuery(parcelasQuery, [distribuicaoIds]);

      parcelasResult.rows.forEach(p => {
        if (!parcelasMap[p.distribuicao_id]) {
          parcelasMap[p.distribuicao_id] = [];
        }
        parcelasMap[p.distribuicao_id].push(p);
      });
    }

    // Agrupar por beneficiário
    const beneficiariosMap: Record<string, any> = {};

    comissoesResult.rows.forEach(row => {
      const benefId = row.beneficiario_id;

      if (!beneficiariosMap[benefId]) {
        beneficiariosMap[benefId] = {
          id: benefId,
          nome: row.beneficiario_nome,
          documento: row.beneficiario_documento,
          cargo: row.cargo,
          email: row.email,
          vendas: [],
          totais: {
            total_comissoes: 0,
            total_pago: 0,
            total_pendente: 0,
            total_atrasado: 0,
            quantidade_vendas: 0
          }
        };
      }

      const parcelas = parcelasMap[row.distribuicao_id] || [];
      const totalPago = parcelas
        .filter(p => p.status === "pago")
        .reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
      const totalPendente = parcelas
        .filter(p => p.status === "pendente")
        .reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
      const totalAtrasado = parcelas
        .filter(p => p.status === "atrasado" || (p.status === "pendente" && new Date(p.data_vencimento) < new Date()))
        .reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);

      beneficiariosMap[benefId].vendas.push({
        venda_id: row.venda_id,
        codigo: row.venda_codigo,
        valor_venda: parseFloat(row.venda_valor),
        data_venda: row.data_venda,
        status_venda: row.venda_status,
        cliente: row.cliente_nome,
        unidade: row.unidade,
        empreendimento: row.empreendimento_nome,
        percentual: parseFloat(row.percentual),
        valor_comissao: parseFloat(row.valor_comissao),
        parcelas: parcelas.map(p => ({
          numero: p.numero_parcela,
          valor: parseFloat(p.valor),
          vencimento: p.data_vencimento,
          status: p.status,
          data_pagamento: p.data_pagamento,
          metodo: p.metodo_pagamento
        })),
        resumo_parcelas: {
          total: parcelas.length,
          pagas: parcelas.filter(p => p.status === "pago").length,
          pendentes: parcelas.filter(p => p.status === "pendente").length,
          atrasadas: parcelas.filter(p => p.status === "atrasado").length
        }
      });

      // Atualizar totais do beneficiário
      beneficiariosMap[benefId].totais.total_comissoes += parseFloat(row.valor_comissao || 0);
      beneficiariosMap[benefId].totais.total_pago += totalPago;
      beneficiariosMap[benefId].totais.total_pendente += totalPendente;
      beneficiariosMap[benefId].totais.total_atrasado += totalAtrasado;
      beneficiariosMap[benefId].totais.quantidade_vendas++;
    });

    const beneficiarios = Object.values(beneficiariosMap);

    // Calcular totais gerais
    const totaisGerais = {
      total_beneficiarios: beneficiarios.length,
      total_comissoes: beneficiarios.reduce((sum, b) => sum + b.totais.total_comissoes, 0),
      total_pago: beneficiarios.reduce((sum, b) => sum + b.totais.total_pago, 0),
      total_pendente: beneficiarios.reduce((sum, b) => sum + b.totais.total_pendente, 0),
      total_atrasado: beneficiarios.reduce((sum, b) => sum + b.totais.total_atrasado, 0),
      total_vendas: beneficiarios.reduce((sum, b) => sum + b.totais.quantidade_vendas, 0)
    };

    // Retornar no formato solicitado
    if (formato === "xlsx") {
      return gerarExcel(beneficiarios, totaisGerais);
    }

    if (formato === "pdf") {
      return NextResponse.json({
        success: true,
        formato: "pdf_data",
        data: {
          titulo: "Relatório de Comissões",
          periodo: {
            inicio: dataInicio || "Início",
            fim: dataFim || "Atual"
          },
          gerado_em: new Date().toISOString(),
          gerado_por: user.nome,
          beneficiarios,
          totais: totaisGerais
        }
      });
    }

    // Formato JSON (padrão)
    return NextResponse.json({
      success: true,
      data: {
        beneficiarios,
        totais: totaisGerais,
        filtros: {
          beneficiario_id: beneficiarioId,
          data_inicio: dataInicio,
          data_fim: dataFim
        },
        gerado_em: new Date().toISOString(),
        gerado_por: user.nome
      }
    });
  } catch (error: any) {
    console.error("Erro ao gerar relatório de comissões:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

function gerarExcel(beneficiarios: any[], totais: any): NextResponse {
  const wb = XLSX.utils.book_new();

  // Aba 1: Resumo por Beneficiário
  const resumoBeneficiarios = beneficiarios.map(b => ({
    "Nome": b.nome,
    "CPF/CNPJ": b.documento,
    "Cargo": b.cargo,
    "Email": b.email,
    "Total Comissões (R$)": b.totais.total_comissoes,
    "Total Pago (R$)": b.totais.total_pago,
    "Total Pendente (R$)": b.totais.total_pendente,
    "Total Atrasado (R$)": b.totais.total_atrasado,
    "Qtd. Vendas": b.totais.quantidade_vendas
  }));

  // Adicionar linha de totais
  resumoBeneficiarios.push({
    "Nome": "TOTAL GERAL",
    "CPF/CNPJ": "",
    "Cargo": "",
    "Email": "",
    "Total Comissões (R$)": totais.total_comissoes,
    "Total Pago (R$)": totais.total_pago,
    "Total Pendente (R$)": totais.total_pendente,
    "Total Atrasado (R$)": totais.total_atrasado,
    "Qtd. Vendas": totais.total_vendas
  });

  const wsResumo = XLSX.utils.json_to_sheet(resumoBeneficiarios);
  wsResumo["!cols"] = [
    { wch: 30 }, { wch: 18 }, { wch: 15 }, { wch: 30 },
    { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  // Aba 2: Detalhamento de Vendas
  const detalheVendas: any[] = [];
  beneficiarios.forEach(b => {
    b.vendas.forEach((v: any) => {
      detalheVendas.push({
        "Beneficiário": b.nome,
        "Código Venda": v.codigo,
        "Data Venda": v.data_venda ? new Date(v.data_venda).toLocaleDateString("pt-BR") : "",
        "Cliente": v.cliente,
        "Unidade": v.unidade,
        "Empreendimento": v.empreendimento,
        "Valor Venda (R$)": v.valor_venda,
        "% Comissão": v.percentual,
        "Valor Comissão (R$)": v.valor_comissao,
        "Status": v.status_venda,
        "Parcelas Pagas": v.resumo_parcelas.pagas,
        "Parcelas Pendentes": v.resumo_parcelas.pendentes
      });
    });
  });

  const wsVendas = XLSX.utils.json_to_sheet(detalheVendas);
  wsVendas["!cols"] = [
    { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
    { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 15 },
    { wch: 15 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsVendas, "Detalhamento");

  // Aba 3: Parcelas
  const detalheParcelas: any[] = [];
  beneficiarios.forEach(b => {
    b.vendas.forEach((v: any) => {
      v.parcelas.forEach((p: any) => {
        detalheParcelas.push({
          "Beneficiário": b.nome,
          "Código Venda": v.codigo,
          "Parcela": p.numero,
          "Valor (R$)": p.valor,
          "Vencimento": p.vencimento ? new Date(p.vencimento).toLocaleDateString("pt-BR") : "",
          "Status": p.status,
          "Data Pagamento": p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString("pt-BR") : "",
          "Método": p.metodo || ""
        });
      });
    });
  });

  const wsParcelas = XLSX.utils.json_to_sheet(detalheParcelas);
  wsParcelas["!cols"] = [
    { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
    { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsParcelas, "Parcelas");

  // Gerar buffer
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `relatorio_comissoes_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
