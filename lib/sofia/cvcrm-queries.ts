/**
 * CV CRM Queries para Sofia
 *
 * Funcoes para consultar dados do CV CRM para a assistente virtual Sofia usar.
 * Utiliza as tabelas cvcrm_* sincronizadas do CV CRM.
 */

import { dbQuery } from "@/lib/db";

// ============================================================================
// Types
// ============================================================================

export interface Lead {
  id: string;
  cvcrm_id: number;
  nome: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cpf?: string;
  origem?: string;
  situacao_nome?: string;
  situacao_cor?: string;
  corretor_nome?: string;
  empreendimentos?: any[];
  score?: number;
  data_cadastro_cvcrm?: string;
  created_at: string;
}

export interface ReservaStatus {
  id: string;
  cvcrm_id: number;
  numero_reserva?: string;
  status?: string;
  cliente_principal_nome?: string;
  empreendimento_nome?: string;
  unidade_nome?: string;
  valor_reserva?: number;
  valor_venda?: number;
  corretor_nome?: string;
  data_reserva?: string;
  data_venda?: string;
}

export interface Comissao {
  id: string;
  cvcrm_id: number;
  tipo?: string;
  corretor_nome?: string;
  empreendimento_nome?: string;
  percentual?: number;
  valor: number;
  status?: string;
  data_previsao?: string;
  data_pagamento?: string;
  reserva_id?: number;
}

export interface Atividade {
  id: string;
  cvcrm_id: number;
  titulo?: string;
  descricao?: string;
  tipo?: string;
  data_inicio?: string;
  data_fim?: string;
  status?: string;
  lead_id?: number;
  cliente_id?: number;
}

export interface RankingCorretor {
  posicao: number;
  corretor_id?: number;
  corretor_nome: string;
  total_vendas: number;
  valor_total: number;
  valor_total_formatado: string;
  total_leads?: number;
  taxa_conversao?: string;
}

export interface MetaCorretor {
  id: string;
  tipo: string;
  meta_valor: number;
  valor_atual: number;
  percentual_atingido: number;
  periodo_inicio?: string;
  periodo_fim?: string;
  status: "no_track" | "behind" | "on_track" | "achieved";
}

// ============================================================================
// 1. getLeadsByCorretor - Retorna leads ativos do corretor
// ============================================================================

export async function getLeadsByCorretor(
  corretorId: string,
  workspaceId: number,
  options?: {
    limit?: number;
    status?: string;
    periodo?: "hoje" | "semana" | "mes" | "todos";
  }
): Promise<{ leads: Lead[]; total: number; resumo: Record<string, number> }> {
  const limit = options?.limit ?? 50;
  const status = options?.status;
  const periodo = options?.periodo ?? "todos";

  // Build WHERE clauses
  const conditions: string[] = ["workspace_id = $1", "corretor_id = $2"];
  const params: any[] = [workspaceId, parseInt(corretorId, 10)];
  let paramIndex = 3;

  // Filter by status (situacao)
  if (status) {
    conditions.push(`LOWER(situacao_nome) ILIKE $${paramIndex}`);
    params.push(`%${status.toLowerCase()}%`);
    paramIndex++;
  }

  // Filter by period
  if (periodo !== "todos") {
    let dateFilter = "";
    switch (periodo) {
      case "hoje":
        dateFilter = `data_cadastro_cvcrm >= CURRENT_DATE`;
        break;
      case "semana":
        dateFilter = `data_cadastro_cvcrm >= CURRENT_DATE - INTERVAL '7 days'`;
        break;
      case "mes":
        dateFilter = `data_cadastro_cvcrm >= CURRENT_DATE - INTERVAL '30 days'`;
        break;
    }
    if (dateFilter) {
      conditions.push(dateFilter);
    }
  }

  // Exclude lost/closed leads to show only "active" ones
  conditions.push(`(
    LOWER(situacao_nome) NOT LIKE '%perdido%'
    AND LOWER(situacao_nome) NOT LIKE '%cancelado%'
    AND LOWER(situacao_nome) NOT LIKE '%desistiu%'
    AND LOWER(situacao_nome) NOT LIKE '%inativo%'
  )`);

  const whereClause = conditions.join(" AND ");

  // Get leads
  const { rows: leads } = await dbQuery(
    `SELECT
      id,
      cvcrm_id,
      nome,
      email,
      telefone,
      celular,
      cpf,
      origem,
      situacao_nome,
      situacao_cor,
      corretor_nome,
      empreendimentos,
      score,
      data_cadastro_cvcrm,
      created_at
    FROM cvcrm_leads
    WHERE ${whereClause}
    ORDER BY data_cadastro_cvcrm DESC NULLS LAST, created_at DESC
    LIMIT $${paramIndex}`,
    [...params, limit]
  );

  // Get total count
  const { rows: countRows } = await dbQuery(
    `SELECT COUNT(*) as total FROM cvcrm_leads WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countRows[0]?.total || "0", 10);

  // Get breakdown by situacao
  const { rows: breakdownRows } = await dbQuery(
    `SELECT
      COALESCE(situacao_nome, 'Sem Status') as situacao,
      COUNT(*) as count
    FROM cvcrm_leads
    WHERE workspace_id = $1
      AND corretor_id = $2
      AND (
        LOWER(situacao_nome) NOT LIKE '%perdido%'
        AND LOWER(situacao_nome) NOT LIKE '%cancelado%'
        AND LOWER(situacao_nome) NOT LIKE '%desistiu%'
        AND LOWER(situacao_nome) NOT LIKE '%inativo%'
      )
    GROUP BY situacao_nome
    ORDER BY count DESC`,
    [workspaceId, parseInt(corretorId, 10)]
  );

  const resumo: Record<string, number> = {};
  for (const row of breakdownRows) {
    resumo[row.situacao] = parseInt(row.count, 10);
  }

  return { leads: leads as Lead[], total, resumo };
}

// ============================================================================
// 2. getReservaStatus - Busca status de reserva por cliente
// ============================================================================

export async function getReservaStatus(
  clienteNome: string,
  workspaceId: number,
  cpf?: string
): Promise<{
  encontrado: boolean;
  reservas: ReservaStatus[];
  mensagem: string;
}> {
  const conditions: string[] = ["workspace_id = $1"];
  const params: any[] = [workspaceId];
  let paramIndex = 2;

  // Search by client name
  if (clienteNome) {
    conditions.push(`LOWER(cliente_principal_nome) ILIKE $${paramIndex}`);
    params.push(`%${clienteNome.toLowerCase()}%`);
    paramIndex++;
  }

  // Search by CPF if provided
  if (cpf) {
    const cleanCpf = cpf.replace(/\D/g, "");
    // Also search in cvcrm_pessoas for CPF match
    conditions.push(`(
      cvcrm_id IN (
        SELECT ra.cvcrm_reserva_id
        FROM cvcrm_reserva_associados ra
        INNER JOIN cvcrm_pessoas p ON p.cvcrm_id = ra.pessoa_id
        WHERE REPLACE(REPLACE(p.cpf, '.', ''), '-', '') LIKE $${paramIndex}
      )
      OR cliente_principal_nome IN (
        SELECT nome FROM cvcrm_pessoas
        WHERE REPLACE(REPLACE(cpf, '.', ''), '-', '') LIKE $${paramIndex}
      )
    )`);
    params.push(`%${cleanCpf}%`);
    paramIndex++;
  }

  if (conditions.length === 0) {
    return {
      encontrado: false,
      reservas: [],
      mensagem: "Informe o nome do cliente ou CPF para buscar.",
    };
  }

  const whereClause = conditions.join(" AND ");

  const { rows } = await dbQuery(
    `SELECT
      id,
      cvcrm_id,
      numero_reserva,
      status,
      cliente_principal_nome,
      empreendimento_nome,
      unidade_nome,
      valor_reserva,
      valor_venda,
      corretor_nome,
      data_reserva,
      data_venda
    FROM cvcrm_reservas
    WHERE ${whereClause}
    ORDER BY data_reserva DESC NULLS LAST, created_at DESC
    LIMIT 10`,
    params
  );

  if (rows.length === 0) {
    return {
      encontrado: false,
      reservas: [],
      mensagem: cpf
        ? `Nenhuma reserva encontrada para CPF "${cpf}" ou nome "${clienteNome}".`
        : `Nenhuma reserva encontrada para "${clienteNome}".`,
    };
  }

  const reservas = rows as ReservaStatus[];
  const statusList = reservas.map(
    (r) =>
      `${r.empreendimento_nome || "Empreendimento"} - ${r.unidade_nome || "Unidade"}: ${r.status || "Sem status"}`
  );

  return {
    encontrado: true,
    reservas,
    mensagem: `Encontradas ${reservas.length} reserva(s) para "${clienteNome}":\n${statusList.join("\n")}`,
  };
}

// ============================================================================
// 3. getComissoesCorretor - Retorna comissoes pendentes e pagas
// ============================================================================

export async function getComissoesCorretor(corretorId: string, workspaceId: number): Promise<{
  comissoes: Comissao[];
  resumo: {
    total_pendente: number;
    total_pago: number;
    total_geral: number;
    quantidade_pendente: number;
    quantidade_pago: number;
  };
}> {
  const corretorIdNum = parseInt(corretorId, 10);

  // Get all commissions for this corretor
  const { rows } = await dbQuery(
    `SELECT
      id,
      cvcrm_id,
      tipo,
      corretor_nome,
      empreendimento_nome,
      percentual,
      valor,
      status,
      data_previsao,
      data_pagamento,
      reserva_id
    FROM cvcrm_comissoes
    WHERE workspace_id = $1 AND corretor_id = $2
    ORDER BY
      CASE WHEN status IN ('pendente', 'aguardando', 'em_analise') THEN 0 ELSE 1 END,
      data_previsao ASC NULLS LAST,
      created_at DESC`,
    [workspaceId, corretorIdNum]
  );

  // Also check cvcrm_reserva_comissoes
  const { rows: reservaComissoes } = await dbQuery(
    `SELECT
      rc.id,
      rc.cvcrm_id,
      rc.tipo_comissao as tipo,
      rc.corretor_nome,
      r.empreendimento_nome,
      rc.percentual,
      rc.valor,
      rc.status,
      r.cvcrm_id as reserva_id
    FROM cvcrm_reserva_comissoes rc
    INNER JOIN cvcrm_reservas r ON r.cvcrm_id = rc.cvcrm_reserva_id
    WHERE rc.workspace_id = $1 AND rc.corretor_id = $2`,
    [workspaceId, corretorIdNum]
  );

  // Combine and dedupe by cvcrm_id
  const comissoesMap = new Map<number, Comissao>();
  for (const row of [...rows, ...reservaComissoes]) {
    if (!comissoesMap.has(row.cvcrm_id)) {
      comissoesMap.set(row.cvcrm_id, row as Comissao);
    }
  }
  const comissoes = Array.from(comissoesMap.values());

  // Calculate totals
  let total_pendente = 0;
  let total_pago = 0;
  let quantidade_pendente = 0;
  let quantidade_pago = 0;

  for (const c of comissoes) {
    const valor = parseFloat(String(c.valor)) || 0;
    const statusLower = (c.status || "").toLowerCase();

    if (
      statusLower.includes("pago") ||
      statusLower.includes("liquidado") ||
      statusLower.includes("quitado")
    ) {
      total_pago += valor;
      quantidade_pago++;
    } else {
      total_pendente += valor;
      quantidade_pendente++;
    }
  }

  return {
    comissoes,
    resumo: {
      total_pendente,
      total_pago,
      total_geral: total_pendente + total_pago,
      quantidade_pendente,
      quantidade_pago,
    },
  };
}

// ============================================================================
// 4. getProximasAtividades - Retorna agenda do corretor
// ============================================================================

export async function getProximasAtividades(
  corretorId: string,
  workspaceId: number,
  dias: number = 7
): Promise<{
  atividades: Atividade[];
  total: number;
  agrupado_por_dia: Record<string, Atividade[]>;
}> {
  const corretorIdNum = parseInt(corretorId, 10);
  const hoje = new Date();
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + dias);

  // Get from cvcrm_agendamentos
  const { rows: agendamentos } = await dbQuery(
    `SELECT
      id,
      cvcrm_id,
      titulo,
      descricao,
      tipo,
      data_inicio,
      data_fim,
      status,
      lead_id,
      cliente_id
    FROM cvcrm_agendamentos
    WHERE workspace_id = $1
    AND (
      participantes::text ILIKE $2
      OR lead_id IN (SELECT cvcrm_id FROM cvcrm_leads WHERE workspace_id = $1 AND corretor_id = $3)
    )
    AND data_inicio >= $4
    AND data_inicio <= $5
    AND (status IS NULL OR LOWER(status) NOT IN ('cancelado', 'cancelada', 'concluido', 'concluida'))
    ORDER BY data_inicio ASC`,
    [workspaceId, `%${corretorIdNum}%`, corretorIdNum, hoje.toISOString(), dataLimite.toISOString()]
  );

  // Get from cvcrm_lead_tarefas
  const { rows: tarefas } = await dbQuery(
    `SELECT
      t.id,
      t.cvcrm_id,
      t.titulo,
      t.descricao,
      t.tipo,
      t.data_agendamento as data_inicio,
      t.data_conclusao as data_fim,
      t.status,
      t.cvcrm_lead_id as lead_id
    FROM cvcrm_lead_tarefas t
    INNER JOIN cvcrm_leads l ON l.cvcrm_id = t.cvcrm_lead_id AND l.workspace_id = $1
    WHERE t.workspace_id = $1
    AND (t.responsavel_id = $2 OR l.corretor_id = $2)
    AND t.data_agendamento >= $3
    AND t.data_agendamento <= $4
    AND (t.status IS NULL OR LOWER(t.status) NOT IN ('concluido', 'concluida', 'cancelado', 'cancelada'))
    ORDER BY t.data_agendamento ASC`,
    [workspaceId, corretorIdNum, hoje.toISOString(), dataLimite.toISOString()]
  );

  // Get from cvcrm_lead_visitas
  const { rows: visitas } = await dbQuery(
    `SELECT
      v.id,
      v.cvcrm_id,
      CONCAT('Visita: ', v.empreendimento_nome) as titulo,
      v.observacoes as descricao,
      'visita' as tipo,
      v.data_agendamento as data_inicio,
      v.data_realizacao as data_fim,
      v.status,
      v.cvcrm_lead_id as lead_id
    FROM cvcrm_lead_visitas v
    WHERE v.workspace_id = $1
    AND v.corretor_id = $2
    AND v.data_agendamento >= $3
    AND v.data_agendamento <= $4
    AND (v.status IS NULL OR LOWER(v.status) NOT IN ('realizada', 'cancelada', 'cancelado'))
    ORDER BY v.data_agendamento ASC`,
    [workspaceId, corretorIdNum, hoje.toISOString(), dataLimite.toISOString()]
  );

  // Combine all activities
  const todasAtividades: Atividade[] = [
    ...(agendamentos as Atividade[]),
    ...(tarefas as Atividade[]),
    ...(visitas as Atividade[]),
  ];

  // Sort by date
  todasAtividades.sort((a, b) => {
    const dateA = a.data_inicio ? new Date(a.data_inicio).getTime() : 0;
    const dateB = b.data_inicio ? new Date(b.data_inicio).getTime() : 0;
    return dateA - dateB;
  });

  // Group by day
  const agrupado_por_dia: Record<string, Atividade[]> = {};
  for (const atividade of todasAtividades) {
    if (atividade.data_inicio) {
      const dia = new Date(atividade.data_inicio).toISOString().split("T")[0];
      if (!agrupado_por_dia[dia]) {
        agrupado_por_dia[dia] = [];
      }
      agrupado_por_dia[dia].push(atividade);
    }
  }

  return {
    atividades: todasAtividades,
    total: todasAtividades.length,
    agrupado_por_dia,
  };
}

// ============================================================================
// 5. getRankingEquipe - Retorna ranking de performance
// ============================================================================

export async function getRankingEquipe(
  workspaceId: number,
  options?: {
    limite?: number;
    periodo?: "mes" | "trimestre" | "ano";
    imobiliariaId?: number;
  }
): Promise<{
  ranking: RankingCorretor[];
  periodo: string;
  periodo_inicio: string;
  periodo_fim: string;
}> {
  const limite = options?.limite ?? 10;
  const periodo = options?.periodo ?? "mes";

  // Calculate period dates
  const now = new Date();
  let start: Date;
  const end = new Date(now);

  switch (periodo) {
    case "trimestre":
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      break;
    case "ano":
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      break;
    case "mes":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  // Build query conditions
  const conditions: string[] = [
    "r.workspace_id = $1",
    "r.data_venda >= $2",
    "r.data_venda <= $3",
    "r.status IN ('vendido', 'concluido', 'ativo', 'aprovado', 'vendida')",
  ];
  const params: any[] = [workspaceId, start.toISOString(), end.toISOString()];
  let paramIndex = 4;

  if (options?.imobiliariaId) {
    conditions.push(`r.imobiliaria_id = $${paramIndex}`);
    params.push(options.imobiliariaId);
    paramIndex++;
  }

  const whereClause = conditions.join(" AND ");

  // Get ranking by sales
  const { rows } = await dbQuery(
    `SELECT
      r.corretor_id,
      COALESCE(r.corretor_nome, c.nome, 'Corretor Desconhecido') as corretor_nome,
      COUNT(*) as total_vendas,
      COALESCE(SUM(r.valor_venda), 0) as valor_total
    FROM cvcrm_reservas r
    LEFT JOIN cvcrm_corretores c ON c.cvcrm_id = r.corretor_id AND c.workspace_id = $1
    WHERE ${whereClause}
    GROUP BY r.corretor_id, r.corretor_nome, c.nome
    ORDER BY total_vendas DESC, valor_total DESC
    LIMIT $${paramIndex}`,
    [...params, limite]
  );

  // Get leads count per corretor for conversion rate
  const { rows: leadsRows } = await dbQuery(
    `SELECT
      corretor_id,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE
        LOWER(situacao_nome) LIKE '%ganho%'
        OR LOWER(situacao_nome) LIKE '%vend%'
        OR LOWER(situacao_nome) LIKE '%fechado%'
      ) as leads_convertidos
    FROM cvcrm_leads
    WHERE workspace_id = $1 AND data_cadastro_cvcrm >= $2 AND data_cadastro_cvcrm <= $3
    GROUP BY corretor_id`,
    [workspaceId, start.toISOString(), end.toISOString()]
  );

  const leadsMap = new Map<number, { total: number; convertidos: number }>();
  for (const row of leadsRows) {
    leadsMap.set(row.corretor_id, {
      total: parseInt(row.total_leads, 10),
      convertidos: parseInt(row.leads_convertidos, 10),
    });
  }

  const ranking: RankingCorretor[] = rows.map((row, index) => {
    const leadsInfo = leadsMap.get(row.corretor_id);
    const totalLeads = leadsInfo?.total || 0;
    const convertidos = leadsInfo?.convertidos || 0;
    const taxaConversao =
      totalLeads > 0 ? ((convertidos / totalLeads) * 100).toFixed(1) : "0.0";

    return {
      posicao: index + 1,
      corretor_id: row.corretor_id,
      corretor_nome: row.corretor_nome,
      total_vendas: parseInt(row.total_vendas, 10),
      valor_total: parseFloat(row.valor_total),
      valor_total_formatado: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(parseFloat(row.valor_total)),
      total_leads: totalLeads,
      taxa_conversao: `${taxaConversao}%`,
    };
  });

  return {
    ranking,
    periodo,
    periodo_inicio: start.toISOString().split("T")[0],
    periodo_fim: end.toISOString().split("T")[0],
  };
}

// ============================================================================
// 6. getMetasCorretor - Retorna metas e progresso
// ============================================================================

export async function getMetasCorretor(corretorId: string, workspaceId: number): Promise<{
  metas: MetaCorretor[];
  resumo: {
    total_metas: number;
    metas_atingidas: number;
    metas_em_andamento: number;
    percentual_geral: number;
  };
}> {
  const corretorIdNum = parseInt(corretorId, 10);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get actual sales for this month
  const { rows: vendasRows } = await dbQuery(
    `SELECT
      COUNT(*) as quantidade_vendas,
      COALESCE(SUM(valor_venda), 0) as valor_vendas
    FROM cvcrm_reservas
    WHERE workspace_id = $1
    AND corretor_id = $2
    AND data_venda >= $3
    AND data_venda <= $4
    AND status IN ('vendido', 'concluido', 'ativo', 'aprovado', 'vendida')`,
    [workspaceId, corretorIdNum, startOfMonth.toISOString(), endOfMonth.toISOString()]
  );

  const quantidadeVendas = parseInt(vendasRows[0]?.quantidade_vendas || "0", 10);
  const valorVendas = parseFloat(vendasRows[0]?.valor_vendas || "0");

  // Get leads count this month
  const { rows: leadsRows } = await dbQuery(
    `SELECT
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE
        LOWER(situacao_nome) LIKE '%ganho%'
        OR LOWER(situacao_nome) LIKE '%vend%'
        OR LOWER(situacao_nome) LIKE '%fechado%'
      ) as leads_convertidos
    FROM cvcrm_leads
    WHERE workspace_id = $1
    AND corretor_id = $2
    AND data_cadastro_cvcrm >= $3
    AND data_cadastro_cvcrm <= $4`,
    [workspaceId, corretorIdNum, startOfMonth.toISOString(), endOfMonth.toISOString()]
  );

  const totalLeads = parseInt(leadsRows[0]?.total_leads || "0", 10);
  const leadsConvertidos = parseInt(leadsRows[0]?.leads_convertidos || "0", 10);

  // Get visits this month
  const { rows: visitasRows } = await dbQuery(
    `SELECT COUNT(*) as total_visitas
    FROM cvcrm_lead_visitas
    WHERE workspace_id = $1
    AND corretor_id = $2
    AND data_agendamento >= $3
    AND data_agendamento <= $4
    AND LOWER(status) IN ('realizada', 'concluida', 'concluido')`,
    [workspaceId, corretorIdNum, startOfMonth.toISOString(), endOfMonth.toISOString()]
  );

  const totalVisitas = parseInt(visitasRows[0]?.total_visitas || "0", 10);

  // Define standard goals (these could come from a config table in the future)
  const metasConfig = [
    { tipo: "vendas_quantidade", meta_valor: 5, valor_atual: quantidadeVendas },
    { tipo: "vendas_valor", meta_valor: 500000, valor_atual: valorVendas },
    { tipo: "leads_novos", meta_valor: 30, valor_atual: totalLeads },
    { tipo: "leads_convertidos", meta_valor: 3, valor_atual: leadsConvertidos },
    { tipo: "visitas_realizadas", meta_valor: 15, valor_atual: totalVisitas },
  ];

  const metas: MetaCorretor[] = metasConfig.map((config, index) => {
    const percentual =
      config.meta_valor > 0
        ? Math.min(100, (config.valor_atual / config.meta_valor) * 100)
        : 0;

    let status: MetaCorretor["status"] = "no_track";
    const diasNoMes = endOfMonth.getDate();
    const diaAtual = now.getDate();
    const progressoEsperado = (diaAtual / diasNoMes) * 100;

    if (percentual >= 100) {
      status = "achieved";
    } else if (percentual >= progressoEsperado * 0.8) {
      status = "on_track";
    } else if (percentual > 0) {
      status = "behind";
    }

    return {
      id: `meta-${index + 1}`,
      tipo: config.tipo,
      meta_valor: config.meta_valor,
      valor_atual: config.valor_atual,
      percentual_atingido: Math.round(percentual * 10) / 10,
      periodo_inicio: startOfMonth.toISOString().split("T")[0],
      periodo_fim: endOfMonth.toISOString().split("T")[0],
      status,
    };
  });

  const metasAtingidas = metas.filter((m) => m.status === "achieved").length;
  const metasEmAndamento = metas.filter(
    (m) => m.status === "on_track" || m.status === "behind"
  ).length;
  const percentualGeral =
    metas.length > 0
      ? Math.round(
          (metas.reduce((acc, m) => acc + m.percentual_atingido, 0) /
            metas.length) *
            10
        ) / 10
      : 0;

  return {
    metas,
    resumo: {
      total_metas: metas.length,
      metas_atingidas: metasAtingidas,
      metas_em_andamento: metasEmAndamento,
      percentual_geral: percentualGeral,
    },
  };
}

// ============================================================================
// Helper: Format currency in BRL
// ============================================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// ============================================================================
// Helper: Get corretor ID by user ID
// ============================================================================

export async function getCorretorIdByUserId(
  userId: string
): Promise<number | null> {
  const { rows } = await dbQuery(
    `SELECT cvcrm_id FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.cvcrm_id || null;
}
