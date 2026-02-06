/**
 * API endpoint para cálculo de score de leads
 * GET /api/leads/score/stats - Obtém estatísticas de scores
 * POST /api/leads/score/stats - Calcula score de múltiplos leads
 */

import { NextRequest, NextResponse } from "next/server"
import { calculateLeadScore, calculateScoreStatistics } from "@/utils/leadScore"
import type { Lead } from "@/types/lead"
import { requireWorkspaceContext } from "@/lib/api-helpers"

/**
 * GET /api/leads/score/stats
 * Retorna estatísticas agregadas de scores de todos os leads
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) return ctx.error

    // Buscar todos os leads da API
    const leadsResponse = await fetch(
      `${request.nextUrl.origin}/api/leads?limit=1000`,
      {
        headers: request.headers,
      }
    )

    if (!leadsResponse.ok) {
      throw new Error("Erro ao buscar leads")
    }

    const leadsData = await leadsResponse.json()
    const leads: Lead[] = leadsData.data || []

    // Calcular score de cada lead
    const scores = leads.map((lead) =>
      calculateLeadScore({ lead })
    )

    // Calcular estatísticas
    const statistics = calculateScoreStatistics(scores)

    // Adicionar nomes aos top leads
    statistics.topPriorityLeads = statistics.topPriorityLeads.map((topLead) => {
      const lead = leads.find((l) => l.id === topLead.leadId)
      return {
        ...topLead,
        nome: lead?.nome || "Desconhecido",
      }
    })

    return NextResponse.json({
      success: true,
      data: statistics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao calcular estatísticas de score:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao calcular estatísticas de score",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/leads/score/stats
 * Calcula scores em batch para múltiplos leads
 * Body: { leadIds?: string[], leads?: Lead[] }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) return ctx.error

    const body = await request.json()
    const { leadIds, leads: providedLeads } = body

    let leads: Lead[] = []

    // Se forneceu IDs, buscar os leads
    if (leadIds && Array.isArray(leadIds)) {
      const leadsResponse = await fetch(
        `${request.nextUrl.origin}/api/leads?limit=1000`,
        {
          headers: request.headers,
        }
      )

      if (!leadsResponse.ok) {
        throw new Error("Erro ao buscar leads")
      }

      const leadsData = await leadsResponse.json()
      const allLeads: Lead[] = leadsData.data || []

      // Filtrar pelos IDs fornecidos
      leads = allLeads.filter((lead) =>
        leadIds.includes(String(lead.id))
      )
    }
    // Se forneceu os leads diretamente
    else if (providedLeads && Array.isArray(providedLeads)) {
      leads = providedLeads
    }
    // Se não forneceu nada, buscar todos
    else {
      const leadsResponse = await fetch(
        `${request.nextUrl.origin}/api/leads?limit=1000`,
        {
          headers: request.headers,
        }
      )

      if (!leadsResponse.ok) {
        throw new Error("Erro ao buscar leads")
      }

      const leadsData = await leadsResponse.json()
      leads = leadsData.data || []
    }

    // Calcular score de cada lead
    const scores = leads.map((lead) => {
      const score = calculateLeadScore({ lead })
      return {
        leadId: lead.id,
        leadName: lead.nome,
        score: score.score,
        temperature: score.temperature,
        priority: score.priority,
        actionCategory: score.actionCategory,
        actionMessage: score.actionMessage,
        mainReason: score.mainReason,
        factors: score.factors,
      }
    })

    // Ordenar por prioridade
    scores.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      return b.score - a.score
    })

    return NextResponse.json({
      success: true,
      data: {
        totalLeads: scores.length,
        scores,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao calcular scores em batch:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao calcular scores",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}
