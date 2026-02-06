import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceContext } from "@/lib/api-helpers"
import { withTenant } from "@/lib/tenant-context"

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) {
      return NextResponse.json({ inQueue: false, plantao_ativo: false })
    }

    const userId = ctx.user.id
    const workspaceId = ctx.workspaceId

    return await withTenant(workspaceId, async (client) => {
      const result = await client.query(`
        SELECT
          p.id as plantao_id,
          p.local_id,
          l.nome as local_nome,
          p.sorteio_realizado,
          p.meta_ofertas,
          pr.id as presenca_id,
          pr.posicao_fila,
          pr.sorteio_posicao,
          pr.em_atendimento,
          pr.pausado,
          pr.feedback_pendente,
          pr.leads_ativos,
          q.qualificado,
          q.total_ofertas,
          (
            SELECT COUNT(*)
            FROM recepcao_presencas pr2
            WHERE pr2.plantao_id = p.id
            AND pr2.status = 'presente'
            AND pr2.pausado = false
            AND pr2.em_atendimento = false
            AND pr2.feedback_pendente = false
            AND (pr2.leads_ativos IS NULL OR pr2.leads_ativos < 5)
            AND COALESCE(pr2.sorteio_posicao, pr2.posicao_fila) < COALESCE(pr.sorteio_posicao, pr.posicao_fila)
          )::int + 1 as posicao_real
        FROM recepcao_plantoes p
        JOIN recepcao_locais l ON l.id = p.local_id
        JOIN recepcao_presencas pr ON pr.plantao_id = p.id
        LEFT JOIN roleta_qualificacao q ON q.presenca_id = pr.id
        WHERE p.data = CURRENT_DATE
        AND p.status = 'ativo'
        AND pr.user_id = $1
        AND pr.status = 'presente'
        AND (
          (p.hora_inicio <= CURRENT_TIME AND p.hora_fim >= CURRENT_TIME)
          OR p.hora_inicio > CURRENT_TIME
        )
        ORDER BY p.hora_inicio
        LIMIT 1
      `, [userId])

      if (result.rows.length === 0) {
        return NextResponse.json({
          inQueue: false,
          plantao_ativo: false,
          isMyTurn: false,
        })
      }

      const row = result.rows[0]
      const posicao = row.sorteio_posicao || row.posicao_fila
      const posicaoReal = row.posicao_real

      // Derive status
      let status: string
      if (row.em_atendimento) {
        status = "atendendo"
      } else if (row.pausado) {
        status = "pausado"
      } else if (row.feedback_pendente) {
        status = "feedback"
      } else if (row.leads_ativos >= 5) {
        status = "limite"
      } else {
        status = "disponivel"
      }

      const isMyTurn = posicaoReal === 1 &&
        !row.em_atendimento &&
        !row.pausado &&
        !row.feedback_pendente &&
        (row.leads_ativos === null || row.leads_ativos < 5)

      return NextResponse.json({
        inQueue: true,
        plantao_ativo: true,
        isMyTurn,
        status,
        posicao,
        posicaoReal,
        localNome: row.local_nome,
        em_atendimento: row.em_atendimento,
        pausado: row.pausado,
        feedback_pendente: row.feedback_pendente,
        leads_ativos: row.leads_ativos || 0,
        qualificado: row.qualificado || false,
        total_ofertas: row.total_ofertas || 0,
        meta_ofertas: row.meta_ofertas || 30,
        sorteio_realizado: row.sorteio_realizado || false,
      })
    })
  } catch (error) {
    console.error("Error fetching meu-status:", error)
    return NextResponse.json({ inQueue: false, plantao_ativo: false, isMyTurn: false })
  }
}
