import { withTenant } from '../../tenant-context'
import { VoiceAgentToolDefinition } from '../types'

/**
 * Tool: get_reservas_count
 * Count reservations by status
 */
const get_reservas_count: VoiceAgentToolDefinition = {
  name: 'get_reservas_count',
  description: 'Conta o numero de reservas por status. Pode filtrar por status especifico e/ou empreendimento.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Status da reserva para filtrar (ex: pendente, aprovada, cancelada, vendida)'
      },
      empreendimento_id: {
        type: 'number',
        description: 'ID do empreendimento para filtrar'
      }
    }
  },
  execute: async (args: Record<string, any>, workspaceId: number) => {
    const { status, empreendimento_id } = args

    let query = `
      SELECT
        status,
        COUNT(*) as count
      FROM cvcrm_reservas
      WHERE workspace_id = $1
    `
    const params: any[] = [workspaceId]
    let paramIndex = 2

    if (status) {
      query += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (empreendimento_id) {
      query += ` AND empreendimento_id = $${paramIndex}`
      params.push(empreendimento_id)
      paramIndex++
    }

    query += ` GROUP BY status ORDER BY count DESC`

    const result = await withTenant(workspaceId, async (client) => {
      return client.query(query, params)
    })

    return {
      reservas: result.rows,
      total: result.rows.reduce((acc: number, row: any) => acc + parseInt(row.count), 0)
    }
  }
}

/**
 * Tool: get_vendas_mes
 * Get sales for current month
 */
const get_vendas_mes: VoiceAgentToolDefinition = {
  name: 'get_vendas_mes',
  description: 'Retorna as vendas do mes atual, incluindo quantidade e valor total.',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async (_args: Record<string, any>, workspaceId: number) => {
    const query = `
      SELECT
        COUNT(*) as quantidade,
        COALESCE(SUM(valor), 0) as valor_total
      FROM cvcrm_reservas
      WHERE workspace_id = $1
        AND status = 'vendida'
        AND created_at >= date_trunc('month', CURRENT_DATE)
        AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    `

    const result = await withTenant(workspaceId, async (client) => {
      return client.query(query, [workspaceId])
    })
    const row = result.rows[0]

    return {
      quantidade: parseInt(row.quantidade) || 0,
      valor_total: parseFloat(row.valor_total) || 0,
      periodo: 'mes_atual'
    }
  }
}

/**
 * Tool: get_valor_vendas
 * Get total sales value for a period
 */
const get_valor_vendas: VoiceAgentToolDefinition = {
  name: 'get_valor_vendas',
  description: 'Retorna o valor total de vendas para um periodo especifico (mes, trimestre ou ano).',
  parameters: {
    type: 'object',
    properties: {
      periodo: {
        type: 'string',
        description: 'Periodo para calcular o valor de vendas',
        enum: ['mes', 'trimestre', 'ano']
      }
    }
  },
  execute: async (args: Record<string, any>, workspaceId: number) => {
    const { periodo = 'mes' } = args

    let dateFilter: string
    switch (periodo) {
      case 'trimestre':
        dateFilter = `
          created_at >= date_trunc('quarter', CURRENT_DATE)
          AND created_at < date_trunc('quarter', CURRENT_DATE) + INTERVAL '3 months'
        `
        break
      case 'ano':
        dateFilter = `
          created_at >= date_trunc('year', CURRENT_DATE)
          AND created_at < date_trunc('year', CURRENT_DATE) + INTERVAL '1 year'
        `
        break
      case 'mes':
      default:
        dateFilter = `
          created_at >= date_trunc('month', CURRENT_DATE)
          AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        `
        break
    }

    const query = `
      SELECT
        COUNT(*) as quantidade,
        COALESCE(SUM(valor), 0) as valor_total
      FROM cvcrm_reservas
      WHERE workspace_id = $1
        AND status = 'vendida'
        AND ${dateFilter}
    `

    const result = await withTenant(workspaceId, async (client) => {
      return client.query(query, [workspaceId])
    })
    const row = result.rows[0]

    return {
      quantidade: parseInt(row.quantidade) || 0,
      valor_total: parseFloat(row.valor_total) || 0,
      periodo
    }
  }
}

/**
 * Tool: get_disponibilidade
 * Get available units per empreendimento
 */
const get_disponibilidade: VoiceAgentToolDefinition = {
  name: 'get_disponibilidade',
  description: 'Retorna a quantidade de unidades disponiveis por empreendimento.',
  parameters: {
    type: 'object',
    properties: {
      empreendimento_id: {
        type: 'number',
        description: 'ID do empreendimento para filtrar (opcional)'
      }
    }
  },
  execute: async (args: Record<string, any>, workspaceId: number) => {
    const { empreendimento_id } = args

    let query = `
      SELECT
        empreendimento_id,
        COUNT(*) as unidades_disponiveis
      FROM cvcrm_unidades
      WHERE workspace_id = $1
        AND disponivel = true
    `
    const params: any[] = [workspaceId]

    if (empreendimento_id) {
      query += ` AND empreendimento_id = $2`
      params.push(empreendimento_id)
    }

    query += ` GROUP BY empreendimento_id ORDER BY unidades_disponiveis DESC`

    const result = await withTenant(workspaceId, async (client) => {
      return client.query(query, params)
    })

    return {
      disponibilidade: result.rows,
      total_disponiveis: result.rows.reduce((acc: number, row: any) => acc + parseInt(row.unidades_disponiveis), 0)
    }
  }
}

/**
 * Export all reservation tools
 */
export const RESERVAS_TOOLS: VoiceAgentToolDefinition[] = [
  get_reservas_count,
  get_vendas_mes,
  get_valor_vendas,
  get_disponibilidade
]
