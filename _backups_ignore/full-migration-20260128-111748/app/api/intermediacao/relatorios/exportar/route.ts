/**
 * API: Relatórios - Exportação Genérica
 *
 * POST /api/intermediacao/relatorios/exportar - Exportar dados
 * Body: { tipo: 'vendas'|'comissoes'|'parcelas'|'auditoria', filtros, formato: 'xlsx'|'pdf'|'csv' }
 * Gera arquivo e retorna URL ou stream
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/api-auth";
import * as XLSX from "xlsx";

type TipoExportacao = "vendas" | "comissoes" | "parcelas" | "auditoria";
type FormatoExportacao = "xlsx" | "pdf" | "csv";

interface FiltrosExportacao {
  data_inicio?: string;
  data_fim?: string;
  beneficiario_id?: string;
  empreendimento_id?: string;
  status?: string;
  tabela?: string;
  operacao?: string;
  usuario_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !["admin", "gerente", "financeiro", "auditor"].includes(user.role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Permissão insuficiente para exportar dados." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tipo, filtros = {}, formato = "xlsx" } = body as {
      tipo: TipoExportacao;
      filtros: FiltrosExportacao;
      formato: FormatoExportacao;
    };

    // Validar tipo
    const tiposValidos: TipoExportacao[] = ["vendas", "comissoes", "parcelas", "auditoria"];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        { success: false, error: `Tipo inválido. Tipos válidos: ${tiposValidos.join(", ")}` },
        { status: 400 }
      );
    }

    // Validar formato
    const formatosValidos: FormatoExportacao[] = ["xlsx", "pdf", "csv"];
    if (!formatosValidos.includes(formato)) {
      return NextResponse.json(
        { success: false, error: `Formato inválido. Formatos válidos: ${formatosValidos.join(", ")}` },
        { status: 400 }
      );
    }

    // Buscar dados baseado no tipo
    let dados: any[];
    let colunas: { key: string; label: string }[];
    let nomeArquivo: string;

    switch (tipo) {
      case "vendas":
        ({ dados, colunas } = await buscarVendas(filtros));
        nomeArquivo = "exportacao_vendas";
        break;
      case "comissoes":
        ({ dados, colunas } = await buscarComissoes(filtros));
        nomeArquivo = "exportacao_comissoes";
        break;
      case "parcelas":
        ({ dados, colunas } = await buscarParcelas(filtros));
        nomeArquivo = "exportacao_parcelas";
        break;
      case "auditoria":
        // Verificar permissão especial para auditoria
        if (!["admin", "auditor"].includes(user.role || "")) {
          return NextResponse.json(
            { success: false, error: "Apenas admin e auditor podem exportar logs de auditoria." },
            { status: 403 }
          );
        }
        ({ dados, colunas } = await buscarAuditoria(filtros));
        nomeArquivo = "exportacao_auditoria";
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Tipo não implementado" },
          { status: 400 }
        );
    }

    // Gerar arquivo no formato solicitado
    if (formato === "xlsx") {
      return gerarXLSX(dados, colunas, nomeArquivo);
    }

    if (formato === "csv") {
      return gerarCSV(dados, colunas, nomeArquivo);
    }

    if (formato === "pdf") {
      // Para PDF, retornamos os dados estruturados para geração no frontend
      return NextResponse.json({
        success: true,
        formato: "pdf_data",
        data: {
          tipo,
          titulo: getTitulo(tipo),
          colunas,
          dados,
          total_registros: dados.length,
          filtros,
          gerado_em: new Date().toISOString(),
          gerado_por: user.nome
        }
      });
    }

    return NextResponse.json(
      { success: false, error: "Formato não suportado" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Erro ao exportar dados:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

function getTitulo(tipo: TipoExportacao): string {
  const titulos: Record<TipoExportacao, string> = {
    vendas: "Exportação de Vendas",
    comissoes: "Exportação de Comissões",
    parcelas: "Exportação de Parcelas",
    auditoria: "Exportação de Logs de Auditoria"
  };
  return titulos[tipo];
}

async function buscarVendas(filtros: FiltrosExportacao) {
  let whereClause = "WHERE 1=1";
  const params: any[] = [];
  let paramIndex = 1;

  if (filtros.data_inicio) {
    whereClause += ` AND v.data_venda >= $${paramIndex}`;
    params.push(filtros.data_inicio);
    paramIndex++;
  }

  if (filtros.data_fim) {
    whereClause += ` AND v.data_venda <= $${paramIndex}`;
    params.push(filtros.data_fim);
    paramIndex++;
  }

  if (filtros.empreendimento_id) {
    whereClause += ` AND v.empreendimento_id = $${paramIndex}`;
    params.push(filtros.empreendimento_id);
    paramIndex++;
  }

  if (filtros.status) {
    whereClause += ` AND v.status = $${paramIndex}`;
    params.push(filtros.status);
    paramIndex++;
  }

  const query = `
    SELECT
      v.codigo,
      v.data_venda,
      v.cliente_nome,
      v.cliente_cpf_cnpj,
      v.unidade,
      e.nome as empreendimento,
      v.valor_total,
      v.percentual_intermediacao,
      v.valor_comissao,
      v.status,
      u.nome as criado_por,
      v.created_at
    FROM vendas v
    LEFT JOIN empreendimentos e ON e.id = v.empreendimento_id
    LEFT JOIN users u ON u.id = v.criado_por
    ${whereClause}
    ORDER BY v.data_venda DESC
  `;

  const { rows } = await dbQuery(query, params);

  const colunas = [
    { key: "codigo", label: "Código" },
    { key: "data_venda", label: "Data Venda" },
    { key: "cliente_nome", label: "Cliente" },
    { key: "cliente_cpf_cnpj", label: "CPF/CNPJ" },
    { key: "unidade", label: "Unidade" },
    { key: "empreendimento", label: "Empreendimento" },
    { key: "valor_total", label: "Valor Total (R$)" },
    { key: "percentual_intermediacao", label: "% Intermediação" },
    { key: "valor_comissao", label: "Comissão (R$)" },
    { key: "status", label: "Status" },
    { key: "criado_por", label: "Criado Por" }
  ];

  return { dados: rows, colunas };
}

async function buscarComissoes(filtros: FiltrosExportacao) {
  let whereClause = "WHERE 1=1";
  const params: any[] = [];
  let paramIndex = 1;

  if (filtros.data_inicio) {
    whereClause += ` AND v.data_venda >= $${paramIndex}`;
    params.push(filtros.data_inicio);
    paramIndex++;
  }

  if (filtros.data_fim) {
    whereClause += ` AND v.data_venda <= $${paramIndex}`;
    params.push(filtros.data_fim);
    paramIndex++;
  }

  if (filtros.beneficiario_id) {
    whereClause += ` AND dc.beneficiario_id = $${paramIndex}`;
    params.push(filtros.beneficiario_id);
    paramIndex++;
  }

  const query = `
    SELECT
      b.nome as beneficiario,
      b.cpf_cnpj as documento,
      b.cargo,
      v.codigo as venda_codigo,
      v.data_venda,
      v.cliente_nome,
      e.nome as empreendimento,
      v.valor_total as valor_venda,
      dc.percentual,
      dc.valor_comissao
    FROM distribuicao_comissao dc
    INNER JOIN beneficiarios b ON b.id = dc.beneficiario_id
    INNER JOIN vendas v ON v.id = dc.venda_id
    LEFT JOIN empreendimentos e ON e.id = v.empreendimento_id
    ${whereClause}
    ORDER BY b.nome, v.data_venda DESC
  `;

  const { rows } = await dbQuery(query, params);

  const colunas = [
    { key: "beneficiario", label: "Beneficiário" },
    { key: "documento", label: "CPF/CNPJ" },
    { key: "cargo", label: "Cargo" },
    { key: "venda_codigo", label: "Código Venda" },
    { key: "data_venda", label: "Data Venda" },
    { key: "cliente_nome", label: "Cliente" },
    { key: "empreendimento", label: "Empreendimento" },
    { key: "valor_venda", label: "Valor Venda (R$)" },
    { key: "percentual", label: "% Comissão" },
    { key: "valor_comissao", label: "Valor Comissão (R$)" }
  ];

  return { dados: rows, colunas };
}

async function buscarParcelas(filtros: FiltrosExportacao) {
  let whereClause = "WHERE 1=1";
  const params: any[] = [];
  let paramIndex = 1;

  if (filtros.status) {
    if (filtros.status === "atrasado") {
      whereClause += ` AND (p.status = 'atrasado' OR (p.status = 'pendente' AND p.data_vencimento < CURRENT_DATE))`;
    } else {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(filtros.status);
      paramIndex++;
    }
  }

  if (filtros.beneficiario_id) {
    whereClause += ` AND dc.beneficiario_id = $${paramIndex}`;
    params.push(filtros.beneficiario_id);
    paramIndex++;
  }

  if (filtros.data_inicio) {
    whereClause += ` AND p.data_vencimento >= $${paramIndex}`;
    params.push(filtros.data_inicio);
    paramIndex++;
  }

  if (filtros.data_fim) {
    whereClause += ` AND p.data_vencimento <= $${paramIndex}`;
    params.push(filtros.data_fim);
    paramIndex++;
  }

  const query = `
    SELECT
      b.nome as beneficiario,
      b.cpf_cnpj as documento,
      v.codigo as venda_codigo,
      v.cliente_nome,
      p.numero_parcela,
      p.valor,
      p.data_vencimento,
      CASE
        WHEN p.status = 'pago' THEN 'pago'
        WHEN p.data_vencimento < CURRENT_DATE THEN 'atrasado'
        ELSE 'pendente'
      END as status,
      p.data_pagamento,
      p.metodo_pagamento
    FROM parcelas p
    INNER JOIN distribuicao_comissao dc ON dc.id = p.distribuicao_id
    INNER JOIN beneficiarios b ON b.id = dc.beneficiario_id
    INNER JOIN vendas v ON v.id = dc.venda_id
    ${whereClause}
    ORDER BY p.data_vencimento ASC
  `;

  const { rows } = await dbQuery(query, params);

  const colunas = [
    { key: "beneficiario", label: "Beneficiário" },
    { key: "documento", label: "CPF/CNPJ" },
    { key: "venda_codigo", label: "Código Venda" },
    { key: "cliente_nome", label: "Cliente" },
    { key: "numero_parcela", label: "Parcela" },
    { key: "valor", label: "Valor (R$)" },
    { key: "data_vencimento", label: "Vencimento" },
    { key: "status", label: "Status" },
    { key: "data_pagamento", label: "Data Pagamento" },
    { key: "metodo_pagamento", label: "Método" }
  ];

  return { dados: rows, colunas };
}

async function buscarAuditoria(filtros: FiltrosExportacao) {
  let whereClause = "WHERE 1=1";
  const params: any[] = [];
  let paramIndex = 1;

  if (filtros.tabela) {
    whereClause += ` AND la.tabela = $${paramIndex}`;
    params.push(filtros.tabela);
    paramIndex++;
  }

  if (filtros.operacao) {
    whereClause += ` AND la.operacao = $${paramIndex}`;
    params.push(filtros.operacao);
    paramIndex++;
  }

  if (filtros.usuario_id) {
    whereClause += ` AND la.usuario_id = $${paramIndex}`;
    params.push(filtros.usuario_id);
    paramIndex++;
  }

  if (filtros.data_inicio) {
    whereClause += ` AND la.created_at >= $${paramIndex}`;
    params.push(filtros.data_inicio);
    paramIndex++;
  }

  if (filtros.data_fim) {
    whereClause += ` AND la.created_at <= $${paramIndex}`;
    params.push(filtros.data_fim + " 23:59:59");
    paramIndex++;
  }

  const query = `
    SELECT
      la.id,
      la.tabela,
      la.operacao,
      la.registro_id,
      u.nome as usuario,
      la.justificativa,
      la.ip_address,
      la.created_at
    FROM log_auditoria la
    LEFT JOIN users u ON u.id = la.usuario_id
    ${whereClause}
    ORDER BY la.created_at DESC
    LIMIT 10000
  `;

  const { rows } = await dbQuery(query, params);

  const colunas = [
    { key: "id", label: "ID" },
    { key: "tabela", label: "Tabela" },
    { key: "operacao", label: "Operação" },
    { key: "registro_id", label: "ID Registro" },
    { key: "usuario", label: "Usuário" },
    { key: "justificativa", label: "Justificativa" },
    { key: "ip_address", label: "IP" },
    { key: "created_at", label: "Data/Hora" }
  ];

  return { dados: rows, colunas };
}

function gerarXLSX(
  dados: any[],
  colunas: { key: string; label: string }[],
  nomeArquivo: string
): NextResponse {
  // Transformar dados para formato de planilha
  const dadosPlanilha = dados.map(row => {
    const obj: Record<string, any> = {};
    colunas.forEach(col => {
      let valor = row[col.key];

      // Formatar datas
      if (valor instanceof Date) {
        valor = valor.toLocaleDateString("pt-BR");
      } else if (typeof valor === "string" && valor.match(/^\d{4}-\d{2}-\d{2}/)) {
        valor = new Date(valor).toLocaleDateString("pt-BR");
      }

      obj[col.label] = valor ?? "";
    });
    return obj;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dadosPlanilha);

  // Ajustar largura das colunas
  ws["!cols"] = colunas.map(() => ({ wch: 18 }));

  XLSX.utils.book_append_sheet(wb, ws, "Dados");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `${nomeArquivo}_${new Date().toISOString().split("T")[0]}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function gerarCSV(
  dados: any[],
  colunas: { key: string; label: string }[],
  nomeArquivo: string
): NextResponse {
  // Header
  const header = colunas.map(col => col.label).join(";");

  // Rows
  const rows = dados.map(row => {
    return colunas.map(col => {
      let valor = row[col.key];

      // Formatar datas
      if (valor instanceof Date) {
        valor = valor.toLocaleDateString("pt-BR");
      } else if (typeof valor === "string" && valor.match(/^\d{4}-\d{2}-\d{2}/)) {
        valor = new Date(valor).toLocaleDateString("pt-BR");
      }

      if (valor === null || valor === undefined) {
        return "";
      }

      // Escapar strings
      const strValue = String(valor).replace(/"/g, '""');
      if (strValue.includes(";") || strValue.includes("\n") || strValue.includes('"')) {
        return `"${strValue}"`;
      }

      return strValue;
    }).join(";");
  });

  // Combinar com BOM para UTF-8
  const BOM = "\uFEFF";
  const csv = BOM + [header, ...rows].join("\n");

  const filename = `${nomeArquivo}_${new Date().toISOString().split("T")[0]}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
