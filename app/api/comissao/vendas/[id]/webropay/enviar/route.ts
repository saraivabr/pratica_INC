/**
 * API: Enviar Venda para Webropay
 * POST /api/comissao/vendas/[id]/webropay/enviar
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceContext } from '@/lib/api-helpers'
import { withTenant } from '@/lib/tenant-context'
import { cadastrarVenda, WebropayError } from '@/lib/webropay-client'
import { mapVendaParaWebropay, validarPayloadWebropay } from '@/lib/comissao/webropay-mapper'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) return ctx.error

    // Role check
    const role = (ctx.user as any).role
    if (!['admin', 'gerente'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para enviar para Webropay' },
        { status: 403 }
      )
    }

    const { id } = await params
    const vendaId = parseInt(id)
    if (isNaN(vendaId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      // Fetch venda
      const { rows: vendaRows } = await client.query(
        'SELECT * FROM comissao_vendas WHERE id = $1 AND workspace_id = $2',
        [vendaId, ctx.workspaceId]
      )
      if (vendaRows.length === 0) {
        return NextResponse.json({ success: false, error: 'Venda não encontrada' }, { status: 404 })
      }
      const venda = vendaRows[0]

      // Check status — must be calculada or ativa (not already sent)
      if (venda.webropay_status === 'enviada' || venda.webropay_status === 'liberada') {
        return NextResponse.json(
          { success: false, error: `Venda já está com status "${venda.webropay_status}" na Webropay` },
          { status: 409 }
        )
      }

      // Fetch corretores
      const { rows: corretores } = await client.query(
        'SELECT * FROM comissao_corretores WHERE venda_id = $1 ORDER BY prioridade DESC, nome',
        [vendaId]
      )

      // Fetch parcelas
      const { rows: parcelas } = await client.query(
        'SELECT * FROM comissao_parcelas WHERE venda_id = $1 ORDER BY data_prevista, numero',
        [vendaId]
      )

      // Fetch matriz
      const { rows: matrizRows } = await client.query(
        `SELECT *, COALESCE(valor_manual, valor_calculado) as valor_final
         FROM comissao_matriz WHERE venda_id = $1`,
        [vendaId]
      )

      // Validate
      const validation = validarPayloadWebropay(venda, corretores, parcelas, matrizRows)
      if (!validation.valido) {
        return NextResponse.json(
          { success: false, error: 'Dados incompletos para envio', erros: validation.erros },
          { status: 422 }
        )
      }

      // Map to Webropay payload
      const payload = mapVendaParaWebropay(venda, corretores, parcelas, matrizRows)

      // Send to Webropay
      const response = await cadastrarVenda(payload as any)

      // Update local status
      await client.query(
        `UPDATE comissao_vendas
         SET webropay_status = 'enviada',
             webropay_enviada_at = NOW(),
             webropay_response = $1,
             status = 'enviada',
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(response), vendaId]
      )

      return NextResponse.json({
        success: true,
        message: 'Venda enviada para Webropay com sucesso',
        webropay_response: response,
        payload_enviado: payload,
      })
    })
  } catch (error: any) {
    console.error('[Webropay] Erro ao enviar venda:', error)

    if (error instanceof WebropayError) {
      return NextResponse.json(
        { success: false, error: error.message, statusCode: error.statusCode },
        { status: error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
