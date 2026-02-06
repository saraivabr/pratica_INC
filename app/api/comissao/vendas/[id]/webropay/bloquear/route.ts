/**
 * API: Bloquear Venda na Webropay
 * PUT /api/comissao/vendas/[id]/webropay/bloquear
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceContext } from '@/lib/api-helpers'
import { withTenant } from '@/lib/tenant-context'
import { bloquearVenda, WebropayError } from '@/lib/webropay-client'

interface Params {
  params: Promise<{ id: string }>
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request)
    if (ctx.error) return ctx.error

    const role = (ctx.user as any).role
    if (!['admin', 'gerente'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão' },
        { status: 403 }
      )
    }

    const { id } = await params
    const vendaId = parseInt(id)
    if (isNaN(vendaId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM comissao_vendas WHERE id = $1 AND workspace_id = $2',
        [vendaId, ctx.workspaceId]
      )
      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Venda não encontrada' }, { status: 404 })
      }

      const venda = rows[0]
      if (venda.webropay_status !== 'enviada') {
        return NextResponse.json(
          { success: false, error: `Venda deve estar "enviada" para bloquear (atual: ${venda.webropay_status || 'nenhum'})` },
          { status: 422 }
        )
      }

      const response = await bloquearVenda(venda.codigo)

      await client.query(
        `UPDATE comissao_vendas
         SET webropay_status = 'bloqueada',
             webropay_response = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(response), vendaId]
      )

      return NextResponse.json({
        success: true,
        message: 'Venda bloqueada com sucesso',
        webropay_response: response,
      })
    })
  } catch (error: any) {
    console.error('[Webropay] Erro ao bloquear:', error)
    if (error instanceof WebropayError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502 }
      )
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
