/**
 * Agent Actions for WhatsApp Chat
 *
 * POST /api/whatsapp/agent-action
 * Body: { action, phoneNumber, instanceName, params }
 *
 * Actions:
 * - activate_luna: Activate follow-up bot for a conversation
 * - search_imoveis: Search CV CRM for properties
 * - simulate: Calculate mortgage simulation
 * - schedule_visit: Schedule a visit
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace, withTenant } from "@/lib/tenant-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const tenant = await findUserWorkspace(user);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Empresa não configurada" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, phoneNumber, instanceName, params } = body;

    if (!action || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: "action e phoneNumber são obrigatórios" },
        { status: 400 }
      );
    }

    const workspaceId = tenant.id;

    switch (action) {
      case "activate_luna":
        return await handleActivateLuna(workspaceId, user.id, phoneNumber);

      case "search_imoveis":
        return await handleSearchImoveis(workspaceId, params || "");

      case "simulate":
        return await handleSimulate(params || "");

      case "schedule_visit":
        return await handleScheduleVisit(
          workspaceId,
          user.id,
          phoneNumber,
          instanceName,
          params || ""
        );

      default:
        return NextResponse.json(
          { success: false, error: `Ação desconhecida: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("[Agent Action] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ── Activate Luna ─────────────────────────────────────────────────

async function handleActivateLuna(
  workspaceId: number,
  userId: string,
  phoneNumber: string
) {
  try {
    // Import dynamically to avoid circular deps
    const { getOrCreateConversation } = await import(
      "@/lib/salva-leads/conversation"
    );

    // Create or reactivate a salva-leads conversation
    const conv = await getOrCreateConversation({
      workspaceId,
      atendimentoId: `manual-${phoneNumber}-${Date.now()}`,
      leadPhone: phoneNumber,
      leadName: null,
      corretorId: userId,
      corretorPhone: null,
    });

    return NextResponse.json({
      success: true,
      result: {
        action: "activate_luna",
        title: "Luna Ativada",
        content: `Follow-up automático ativado para ${phoneNumber}. Luna irá responder mensagens recebidas automaticamente.`,
        formattedMessage: null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Erro ao ativar Luna: ${err.message}`,
    });
  }
}

// ── Search Imóveis ────────────────────────────────────────────────

async function handleSearchImoveis(
  _workspaceId: number,
  query: string
) {
  try {
    // Search empreendimentos from CV CRM sync
    // Note: cvcrm_empreendimentos doesn't have workspace_id, uses RLS-free query
    const { dbQuery } = await import("@/lib/db");
    const { rows: results } = await dbQuery(
      `SELECT nome, cidade, uf, tipo, status, total_unidades, endereco_completo
       FROM cvcrm_empreendimentos
       ORDER BY updated_at DESC
       LIMIT 20`
    );

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        result: {
          action: "search_imoveis",
          title: "Busca de Imóveis",
          content: "Nenhum empreendimento encontrado no CRM.",
          formattedMessage: null,
        },
      });
    }

    // Filter by query keywords
    const keywords = query.toLowerCase().split(/\s+/);
    let filtered = results;
    if (query.trim()) {
      filtered = results.filter((r: any) => {
        const text = `${r.nome} ${r.cidade} ${r.tipo} ${r.uf} ${r.endereco_completo || ""}`.toLowerCase();
        return keywords.some((kw) => text.includes(kw));
      });
      if (filtered.length === 0) filtered = results.slice(0, 3);
    } else {
      filtered = results.slice(0, 3);
    }

    const lines = filtered.slice(0, 5).map((r: any, i: number) => {
      const location = [r.cidade, r.uf].filter(Boolean).join("/");
      const units = r.total_unidades ? `${r.total_unidades} unidades` : "";
      const tipo = r.tipo || "";
      return `${i + 1}. *${r.nome}*${tipo ? ` - ${tipo}` : ""}\n   ${location}${units ? ` · ${units}` : ""}`;
    });

    const content = lines.join("\n\n");
    const formattedMessage = `Encontrei estas opcoes para voce:\n\n${content}\n\nQual te interessa mais? Posso enviar mais detalhes!`;

    return NextResponse.json({
      success: true,
      result: {
        action: "search_imoveis",
        title: "Busca de Imóveis",
        content,
        formattedMessage,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Erro na busca: ${err.message}`,
    });
  }
}

// ── Simulate Financing ────────────────────────────────────────────

async function handleSimulate(params: string) {
  // Parse params: "280000 entrada 50000 taxa 0.99 prazo 360"
  const numbers = params.match(/[\d.]+/g)?.map(Number) || [];

  let valor = numbers[0] || 300000;
  let entrada = numbers[1] || 0;
  let taxaMensal = numbers[2] || 0.99;
  let prazoMeses = numbers[3] || 360;

  // Try parsing keywords
  const lowerParams = params.toLowerCase();
  if (lowerParams.includes("entrada")) {
    const match = lowerParams.match(/entrada\s*([\d.]+)/);
    if (match) entrada = Number(match[1]);
  }
  if (lowerParams.includes("taxa")) {
    const match = lowerParams.match(/taxa\s*([\d.]+)/);
    if (match) taxaMensal = Number(match[1]);
  }
  if (lowerParams.includes("prazo")) {
    const match = lowerParams.match(/prazo\s*(\d+)/);
    if (match) prazoMeses = Number(match[1]);
  }

  const financiado = valor - entrada;
  const taxaDecimal = taxaMensal / 100;

  // SAC system - first installment
  const amortizacao = financiado / prazoMeses;
  const jurosPrimeira = financiado * taxaDecimal;
  const parcelaPrimeira = amortizacao + jurosPrimeira;

  // Last installment
  const jurosUltima = amortizacao * taxaDecimal;
  const parcelaUltima = amortizacao + jurosUltima;

  // Price table (fixed)
  const parcelaPrice =
    (financiado * taxaDecimal * Math.pow(1 + taxaDecimal, prazoMeses)) /
    (Math.pow(1 + taxaDecimal, prazoMeses) - 1);

  const fmt = (n: number) =>
    `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const content = [
    `Valor do imóvel: ${fmt(valor)}`,
    `Entrada: ${fmt(entrada)} (${((entrada / valor) * 100).toFixed(0)}%)`,
    `Financiado: ${fmt(financiado)}`,
    `Taxa: ${taxaMensal}% a.m.`,
    `Prazo: ${prazoMeses} meses (${(prazoMeses / 12).toFixed(0)} anos)`,
    ``,
    `SAC: ${fmt(parcelaPrimeira)} (1a) → ${fmt(parcelaUltima)} (última)`,
    `PRICE: ${fmt(parcelaPrice)} (fixa)`,
  ].join("\n");

  const formattedMessage = [
    `Simulação de financiamento:`,
    ``,
    `Valor: ${fmt(valor)}`,
    `Entrada: ${fmt(entrada)}`,
    `Financiado: ${fmt(financiado)}`,
    `Taxa: ${taxaMensal}% a.m. | Prazo: ${prazoMeses} meses`,
    ``,
    `*SAC:* ${fmt(parcelaPrimeira)} (1a parcela) a ${fmt(parcelaUltima)} (última)`,
    `*PRICE:* ${fmt(parcelaPrice)} (parcela fixa)`,
    ``,
    `Quer que eu detalhe alguma opção?`,
  ].join("\n");

  return NextResponse.json({
    success: true,
    result: {
      action: "simulate",
      title: "Simulação de Financiamento",
      content,
      formattedMessage,
    },
  });
}

// ── Schedule Visit ────────────────────────────────────────────────

async function handleScheduleVisit(
  workspaceId: number,
  userId: string,
  phoneNumber: string,
  instanceName: string,
  params: string
) {
  // Simple visit scheduling — create a reminder message
  const content = `Visita agendada: ${params || "A definir"}`;
  const formattedMessage = `Olá! Confirmando sua visita: *${params || "a combinar"}*.\n\nVou te enviar a localização no dia. Qualquer dúvida, é só chamar!`;

  return NextResponse.json({
    success: true,
    result: {
      action: "schedule_visit",
      title: "Agendar Visita",
      content,
      formattedMessage,
    },
  });
}
