/**
 * API: Obter Boleto de Parcela na Webropay
 * GET /api/comissao/vendas/[id]/webropay/boleto?parcelaId=X
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceContext } from '@/lib/api-helpers'
import { withTenant } from '@/lib/tenant-context'
import { obterBoleto, WebropayError } from '@/lib/webropay-client'

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

    const parcelaId = request.nextUrl.searchParams.get('parcelaId')
    if (!parcelaId) {
      return NextResponse.json(
        { success: false, error: 'parcelaId é obrigatório' },
        { status: 400 }
      )
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
      if (!venda.webropay_status || venda.webropay_status === 'pendente') {
        return NextResponse.json(
          { success: false, error: 'Venda ainda não foi enviada para Webropay' },
          { status: 422 }
        )
      }

      const response = await obterBoleto(venda.codigo, parcelaId)

      return NextResponse.json({
        success: true,
        urlBoleto: response.urlBoleto,
      })
    })
  } catch (error: any) {
    console.error('[Webropay] Erro ao obter boleto:', error)
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
