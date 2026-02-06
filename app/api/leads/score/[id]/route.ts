/**
 * API endpoint para cálculo de score de um lead específico
 * GET /api/leads/score/[id] - Calcula e retorna score de um lead
 */

import { NextRequest, NextResponse } from "next/server"
import { calculateLeadScore } from "@/utils/leadScore"
import type { Lead } from "@/types/lead"
import { requireWorkspaceContext } from "@/lib/api-helpers"

/**
 * GET /api/leads/score/[id]
 * Calcula e retorna o score completo de um lead específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) return ctx.error

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID do lead não fornecido",
        },
        { status: 400 }
      )
    }

    // Buscar o lead da API
    const leadResponse = await fetch(
      `${request.nextUrl.origin}/api/leads/${id}`,
      {
        headers: request.headers,
      }
    )

    if (!leadResponse.ok) {
      throw new Error("Lead não encontrado")
    }

    const leadData = await leadResponse.json()
    const lead: Lead = leadData.data || leadData

    // Calcular score
    const leadScore = calculateLeadScore({ lead })

    return NextResponse.json({
      success: true,
      data: {
        leadId: lead.id,
        leadName: lead.nome,
        leadScore,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao calcular score do lead:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao calcular score do lead",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    )
  }
}
