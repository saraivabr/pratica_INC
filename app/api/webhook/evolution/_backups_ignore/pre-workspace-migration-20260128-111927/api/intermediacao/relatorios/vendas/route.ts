/**
 * API: Relatórios - Vendas
 *
 * GET /api/intermediacao/relatorios/vendas - Relatório de vendas
 * Query params: data_inicio, data_fim, empreendimento, status, formato (json|xlsx|pdf)
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
        { success: false, error: "Acesso negado. Permissão insuficiente para gerar relatório de vendas." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dataInicio = searchParams.get("data_inicio");
    const dataFim = searchParams.get("data_fim");
    const empreendimento = searchParams.get("empreendimento");
    const status = searchParams.get("status");
    const formato = searchParams.get("formato") || "json";

    // Construir query dinamicamente
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    let paramIndex = 1;

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

    if (empreendimento) {
      whereClause += ` AND v.empreendimento_id = $${paramIndex}`;
      params.push(empreendimento);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND v.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Query principal
    const query = `
      SELECT
        v.id,
        v.codigo,
        v.valor_total,
        v.percentual_intermediacao,
        v.valor_comissao,
        v.data_venda,
        v.status,
        v.cliente_nome,
        v.cliente_cpf_cnpj,
        v.unidade,
        v.observacoes,
        v.created_at,
        e.nome as empreendimento_nome,
        u.nome as criado_por_nome
      FROM vendas v
      LEFT JOIN empreendimentos e ON e.id = v.empreendimento_id
      LEFT JOIN users u ON u.id = v.criado_por
      ${whereClause}
      ORDER BY v.data_venda DESC
    `;

    const { rows } = await dbQuery(query, params);

    // Calcular totais
    const totais = {
      total_vendas: rows.length,
      valor_total_vendas: rows.reduce((sum, r) => sum + parseFloat(r.valor_total || 0), 0),
      valor_total_comissoes: rows.reduce((sum, r) => sum + parseFloat(r.valor_comissao || 0), 0),
      por_status: calcularPorStatus(rows),
      por_empreendimento: calcularPorEmpreendimento(rows)
    };

    // Formatar dados para resposta
    const vendas = rows.map(row => ({
      id: row.id,
      codigo: row.codigo,
      valor_total: parseFloat(row.valor_total),
      percentual_intermediacao: parseFloat(row.percentual_intermediacao),
      valor_comissao: parseFloat(row.valor_comissao),
      data_venda: row.data_venda,
      status: row.status,
      cliente: {
        nome: row.cliente_nome,
        cpf_cnpj: row.cliente_cpf_cnpj
      },
      unidade: row.unidade,
      empreendimento: row.empreendimento_nome,
      observacoes: row.observacoes,
      criado_por: row.criado_por_nome,
      created_at: row.created_at
    }));

    // Retornar no formato solicitado
    if (formato === "xlsx") {
      return gerarExcel(vendas, totais);
    }

    if (formato === "pdf") {
      // PDF será tratado no frontend com @react-pdf/renderer
      // Aqui retornamos os dados estruturados para geração do PDF
      return NextResponse.json({
        success: true,
        formato: "pdf_data",
        data: {
          titulo: "Relatório de Vendas",
          periodo: {
            inicio: dataInicio || "Início",
            fim: dataFim || "Atual"
          },
          gerado_em: new Date().toISOString(),
          gerado_por: user.nome,
          vendas,
          totais
        }
      });
    }

    // Formato JSON (padrão)
    return NextResponse.json({
      success: true,
      data: {
        vendas,
        totais,
        filtros: {
          data_inicio: dataInicio,
          data_fim: dataFim,
          empreendimento,
          status
        },
        gerado_em: new Date().toISOString(),
        gerado_por: user.nome
      }
    });
  } catch (error: any) {
    console.error("Erro ao gerar relatório de vendas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

function calcularPorStatus(rows: any[]): any[] {
  const porStatus: Record<string, { quantidade: number; valor: number }> = {};

  rows.forEach(row => {
    const st = row.status || "sem_status";
    if (!porStatus[st]) {
      porStatus[st] = { quantidade: 0, valor: 0 };
    }
    porStatus[st].quantidade++;
    porStatus[st].valor += parseFloat(row.valor_total || 0);
  });

  return Object.entries(porStatus).map(([status, dados]) => ({
    status,
    quantidade: dados.quantidade,
    valor_total: dados.valor
  }));
}

function calcularPorEmpreendimento(rows: any[]): any[] {
  const porEmpreendimento: Record<string, { quantidade: number; valor: number }> = {};

  rows.forEach(row => {
    const emp = row.empreendimento_nome || "Sem empreendimento";
    if (!porEmpreendimento[emp]) {
      porEmpreendimento[emp] = { quantidade: 0, valor: 0 };
    }
    porEmpreendimento[emp].quantidade++;
    porEmpreendimento[emp].valor += parseFloat(row.valor_total || 0);
  });

  return Object.entries(porEmpreendimento)
    .map(([empreendimento, dados]) => ({
      empreendimento,
      quantidade: dados.quantidade,
      valor_total: dados.valor
    }))
    .sort((a, b) => b.valor_total - a.valor_total);
}

function gerarExcel(vendas: any[], totais: any): NextResponse {
  // Criar dados para a planilha
  const dadosPlanilha = vendas.map(v => ({
    "Código": v.codigo,
    "Data Venda": v.data_venda ? new Date(v.data_venda).toLocaleDateString("pt-BR") : "",
    "Cliente": v.cliente.nome,
    "CPF/CNPJ": v.cliente.cpf_cnpj,
    "Unidade": v.unidade,
    "Empreendimento": v.empreendimento,
    "Valor Total (R$)": v.valor_total,
    "% Intermediação": v.percentual_intermediacao,
    "Comissão (R$)": v.valor_comissao,
    "Status": v.status,
    "Criado Por": v.criado_por
  }));

  // Adicionar linha de totais
  dadosPlanilha.push({
    "Código": "",
    "Data Venda": "",
    "Cliente": "",
    "CPF/CNPJ": "",
    "Unidade": "",
    "Empreendimento": "TOTAIS",
    "Valor Total (R$)": totais.valor_total_vendas,
    "% Intermediação": "",
    "Comissão (R$)": totais.valor_total_comissoes,
    "Status": `${totais.total_vendas} vendas`,
    "Criado Por": ""
  });

  // Criar workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dadosPlanilha);

  // Ajustar largura das colunas
  const colWidths = [
    { wch: 12 }, // Código
    { wch: 12 }, // Data Venda
    { wch: 30 }, // Cliente
    { wch: 18 }, // CPF/CNPJ
    { wch: 15 }, // Unidade
    { wch: 25 }, // Empreendimento
    { wch: 15 }, // Valor Total
    { wch: 15 }, // % Intermediação
    { wch: 15 }, // Comissão
    { wch: 15 }, // Status
    { wch: 20 }, // Criado Por
  ];
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Vendas");

  // Adicionar aba de resumo por status
  const resumoStatus = totais.por_status.map((s: any) => ({
    "Status": s.status,
    "Quantidade": s.quantidade,
    "Valor Total (R$)": s.valor_total
  }));
  const wsStatus = XLSX.utils.json_to_sheet(resumoStatus);
  XLSX.utils.book_append_sheet(wb, wsStatus, "Por Status");

  // Adicionar aba de resumo por empreendimento
  const resumoEmp = totais.por_empreendimento.map((e: any) => ({
    "Empreendimento": e.empreendimento,
    "Quantidade": e.quantidade,
    "Valor Total (R$)": e.valor_total
  }));
  const wsEmp = XLSX.utils.json_to_sheet(resumoEmp);
  XLSX.utils.book_append_sheet(wb, wsEmp, "Por Empreendimento");

  // Gerar buffer
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  // Retornar como arquivo
  const filename = `relatorio_vendas_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
