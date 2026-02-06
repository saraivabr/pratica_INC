import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceContext } from "@/lib/api-helpers"
import { withTenant } from "@/lib/tenant-context"

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) {
      return NextResponse.json({ posicao: null, plantao_ativo: false })
    }

    const userId = ctx.user.id
    const workspaceId = ctx.workspaceId

    return await withTenant(workspaceId, async (client) => {
      // Busca plantão ativo de hoje e a presença do corretor
      const result = await client.query(`
        SELECT
          p.id as plantao_id,
          p.local_id,
          l.nome as local_nome,
          pr.id as presenca_id,
          pr.posicao_fila,
          pr.sorteio_posicao,
          pr.em_atendimento,
          pr.pausado,
          pr.feedback_pendente,
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
          posicao: null,
          plantao_ativo: false,
          is_first: false
        })
      }

      const row = result.rows[0]
      const posicao = row.sorteio_posicao || row.posicao_fila
      const posicaoReal = row.posicao_real

      // Verifica se é o primeiro da fila (disponível)
      const isFirst = posicaoReal === 1 &&
        !row.em_atendimento &&
        !row.pausado &&
        !row.feedback_pendente

      return NextResponse.json({
        posicao: posicao,
        posicao_real: posicaoReal,
        plantao_ativo: true,
        is_first: isFirst,
        local_nome: row.local_nome,
        em_atendimento: row.em_atendimento,
        pausado: row.pausado,
        feedback_pendente: row.feedback_pendente,
      })
    })
  } catch (error) {
    console.error("Error fetching minha posicao:", error)
    return NextResponse.json({ posicao: null, plantao_ativo: false })
  }
}
