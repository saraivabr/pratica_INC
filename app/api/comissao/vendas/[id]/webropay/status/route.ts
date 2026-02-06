/**
 * API: Status da Venda na Webropay
 * GET /api/comissao/vendas/[id]/webropay/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceContext } from '@/lib/api-helpers'
import { withTenant } from '@/lib/tenant-context'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) return ctx.error

    const { id } = await params
    const vendaId = parseInt(id)
    if (isNaN(vendaId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      const { rows } = await client.query(
        `SELECT id, codigo, status, webropay_id, webropay_status, webropay_enviada_at, webropay_response
         FROM comissao_vendas WHERE id = $1 AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      )
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Venda não encontrada' }, { status: 404 })
      }

      return NextResponse.json({ success: true, data: rows[0] })
    })
  } catch (error: any) {
    console.error('[Webropay] Erro ao consultar status:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
