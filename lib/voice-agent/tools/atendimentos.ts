/**
 * Voice Agent Tools - Atendimentos (Service/Support)
 *
 * Tools for querying service/support data from the CRM
 */

import { dbQuery } from '../db'
import { VoiceAgentToolDefinition } from '../types'

/**
 * Get pending service requests
 */
const get_atendimentos_pendentes: VoiceAgentToolDefinition = {
  name: 'get_atendimentos_pendentes',
  description: 'Obtém os atendimentos/solicitações de serviço pendentes. Retorna contagem e lista de atendimentos que ainda não foram concluídos.',
  parameters: {
    type: 'object',
    properties: {
      corretor_id: {
        type: 'number',
        description: 'ID do corretor para filtrar atendimentos (opcional)'
      }
    }
  },
  execute: async (args: Record<string, any>, workspaceId: number) => {
    const { corretor_id } = args

    let query = `
      SELECT
        cvcrm_id,
        protocolo,
        tipo,
        assunto,
        descricao,
        status,
        prioridade,
        data_abertura,
        cliente_nome,
        empreendimento_nome,
        unidade_nome,
        responsavel_nome
      FROM cvcrm_atendimentos
      WHERE workspace_id = $1 AND status != 'concluido'
    `
    const params: any[] = [workspaceId]
    let paramIndex = 2

    if (corretor_id) {
      query += ` AND responsavel_id = $${paramIndex}`
      params.push(corretor_id)
      paramIndex++
    }

    query += ` ORDER BY
      CASE prioridade
        WHEN 'alta' THEN 1
        WHEN 'media' THEN 2
        WHEN 'baixa' THEN 3
        ELSE 4
      END,
      data_abertura ASC
      LIMIT 50`

    const result = await dbQuery(query, params)

    return {
      count: result.rows.length,
      atendimentos: result.rows.map(row => ({
        id: row.cvcrm_id,
        protocolo: row.protocolo,
        tipo: row.tipo,
        assunto: row.assunto,
        descricao: row.descricao,
        status: row.status,
        prioridade: row.prioridade,
        data_abertura: row.data_abertura,
        cliente: row.cliente_nome,
        empreendimento: row.empreendimento_nome,
        unidade: row.unidade_nome,
        responsavel: row.responsavel_nome
      }))
    }
  }
}

/**
 * Get complete client history
 */
const get_cliente_historico: VoiceAgentToolDefinition = {
  name: 'get_cliente_historico',
  description: 'Obtém o histórico completo de um cliente, incluindo leads, reservas e atendimentos. Requer cliente_id OU telefone.',
  parameters: {
    type: 'object',
    properties: {
      cliente_id: {
        type: 'number',
        description: 'ID do cliente no CRM'
      },
      telefone: {
        type: 'string',
        description: 'Telefone do cliente para busca'
      }
    }
  },
  execute: async (args: Record<string, any>, workspaceId: number) => {
    const { cliente_id, telefone } = args

    if (!cliente_id && !telefone) {
      return { error: 'Necessário informar cliente_id ou telefone' }
    }

    const result: any = {
      cliente: null,
      leads: [],
      reservas: [],
      atendimentos: []
    }

    // Search by cliente_id or telefone
    if (cliente_id) {
      // Get leads by corretor assignment or direct ID match
      const leadsResult = await dbQuery(`
        SELECT
          idlead,
          nome,
          email,
          telefone,
          data_cad,
          origem,
          situacao,
          score,
          valor_negocio,
          corretor
        FROM cvcrm_leads
        WHERE workspace_id = $1 AND idlead = $2
        ORDER BY data_cad DESC
        LIMIT 20
      `, [workspaceId, cliente_id])
      result.leads = leadsResult.rows

      // Get reservas
      const reservasResult = await dbQuery(`
        SELECT
          cvcrm_id,
          numero_reserva,
          data_reserva,
          status,
          valor_reserva,
          valor_venda,
          empreendimento_nome,
          unidade_nome,
          corretor_nome
        FROM cvcrm_reservas
        WHERE workspace_id = $1 AND cliente_principal_id = $2
        ORDER BY data_reserva DESC
        LIMIT 20
      `, [workspaceId, cliente_id])
      result.reservas = reservasResult.rows

      // Get atendimentos
      const atendimentosResult = await dbQuery(`
        SELECT
          cvcrm_id,
          protocolo,
          tipo,
          assunto,
          status,
          prioridade,
          data_abertura,
          data_fechamento,
          empreendimento_nome,
          unidade_nome
        FROM cvcrm_atendimentos
        WHERE workspace_id = $1 AND cliente_id = $2
        ORDER BY data_abertura DESC
        LIMIT 20
      `, [workspaceId, cliente_id])
      result.atendimentos = atendimentosResult.rows

    } else if (telefone) {
      // Normalize phone for search
      const phoneClean = telefone.replace(/\D/g, '')
      const phonePattern = `%${phoneClean.slice(-9)}%`

      // Get leads by phone
      const leadsResult = await dbQuery(`
        SELECT
          idlead,
          nome,
          email,
          telefone,
          data_cad,
          origem,
          situacao,
          score,
          valor_negocio,
          corretor
        FROM cvcrm_leads
        WHERE workspace_id = $1 AND telefone LIKE $2
        ORDER BY data_cad DESC
        LIMIT 20
      `, [workspaceId, phonePattern])
      result.leads = leadsResult.rows

      if (result.leads.length > 0) {
        result.cliente = {
          nome: result.leads[0].nome,
          email: result.leads[0].email,
          telefone: result.leads[0].telefone
        }

        // Get cliente IDs from leads
        const clienteIds = result.leads.map((l: any) => l.idlead)

        if (clienteIds.length > 0) {
          // Get reservas for these clients
          const reservasResult = await dbQuery(`
            SELECT
              cvcrm_id,
              numero_reserva,
              data_reserva,
              status,
              valor_reserva,
              valor_venda,
              empreendimento_nome,
              unidade_nome,
              corretor_nome,
              cliente_principal_nome
            FROM cvcrm_reservas
            WHERE workspace_id = $1 AND cliente_principal_id = ANY($2)
            ORDER BY data_reserva DESC
            LIMIT 20
          `, [workspaceId, clienteIds])
          result.reservas = reservasResult.rows

          // Get atendimentos for these clients
          const atendimentosResult = await dbQuery(`
            SELECT
              cvcrm_id,
              protocolo,
              tipo,
              assunto,
              status,
              prioridade,
              data_abertura,
              data_fechamento,
              empreendimento_nome,
              unidade_nome
            FROM cvcrm_atendimentos
            WHERE workspace_id = $1 AND cliente_id = ANY($2)
            ORDER BY data_abertura DESC
            LIMIT 20
          `, [workspaceId, clienteIds])
          result.atendimentos = atendimentosResult.rows
        }
      }
    }

    return {
      cliente: result.cliente,
      resumo: {
        total_leads: result.leads.length,
        total_reservas: result.reservas.length,
        total_atendimentos: result.atendimentos.length
      },
      leads: result.leads,
      reservas: result.reservas,
      atendimentos: result.atendimentos
    }
  }
}

/**
 * Get today's schedule
 */
const get_agenda_hoje: VoiceAgentToolDefinition = {
  name: 'get_agenda_hoje',
  description: 'Obtém a agenda de hoje, incluindo tarefas, visitas e agendamentos programados para o dia.',
  parameters: {
    type: 'object',
    properties: {
      corretor_id: {
        type: 'number',
        description: 'ID do corretor para filtrar agenda (opcional)'
      }
    }
  },
  execute: async (args: Record<string, any>, workspaceId: number) => {
    const { corretor_id } = args

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const result: any = {
      tarefas: [],
      visitas: [],
      agendamentos: []
    }

    // Build corretor filter
    let corretorFilter = ''
    const baseParams = [today.toISOString(), tomorrow.toISOString()]

    if (corretor_id) {
      corretorFilter = ' AND responsavel_id = $3'
    }

    // Get tarefas (tasks) scheduled for today
    const tarefasQuery = `
      SELECT
        cvcrm_id,
        titulo,
        descricao,
        tipo,
        status,
        prioridade,
        data_agendamento,
        cvcrm_lead_id
      FROM cvcrm_lead_tarefas
      WHERE workspace_id = $1
        AND data_agendamento >= $2
        AND data_agendamento < $3
        AND status != 'concluida'
        ${corretor_id ? ' AND responsavel_id = $4' : ''}
      ORDER BY data_agendamento ASC
      LIMIT 50
    `
    const tarefasParams = corretor_id ? [workspaceId, ...baseParams, corretor_id] : [workspaceId, ...baseParams]
    const tarefasResult = await dbQuery(tarefasQuery, tarefasParams)
    result.tarefas = tarefasResult.rows

    // Get visitas (visits) scheduled for today
    const visitasQuery = `
      SELECT
        cvcrm_id,
        cvcrm_lead_id,
        empreendimento_nome,
        data_agendamento,
        status,
        observacoes,
        corretor_nome
      FROM cvcrm_lead_visitas
      WHERE workspace_id = $1
        AND data_agendamento >= $2
        AND data_agendamento < $3
        AND status NOT IN ('realizada', 'cancelada')
        ${corretor_id ? ' AND corretor_id = $4' : ''}
      ORDER BY data_agendamento ASC
      LIMIT 50
    `
    const visitasParams = corretor_id ? [workspaceId, ...baseParams, corretor_id] : [workspaceId, ...baseParams]
    const visitasResult = await dbQuery(visitasQuery, visitasParams)
    result.visitas = visitasResult.rows

    // Get agendamentos (appointments) for today
    const agendamentosQuery = `
      SELECT
        cvcrm_id,
        titulo,
        descricao,
        tipo,
        data_inicio,
        data_fim,
        local,
        status,
        participantes
      FROM cvcrm_agendamentos
      WHERE workspace_id = $1
        AND data_inicio >= $2
        AND data_inicio < $3
        AND status != 'cancelado'
      ORDER BY data_inicio ASC
      LIMIT 50
    `
    const agendamentosResult = await dbQuery(agendamentosQuery, [workspaceId, ...baseParams])
    result.agendamentos = agendamentosResult.rows

    return {
      data: today.toISOString().split('T')[0],
      resumo: {
        total_tarefas: result.tarefas.length,
        total_visitas: result.visitas.length,
        total_agendamentos: result.agendamentos.length,
        total_compromissos: result.tarefas.length + result.visitas.length + result.agendamentos.length
      },
      tarefas: result.tarefas.map((t: any) => ({
        id: t.cvcrm_id,
        titulo: t.titulo,
        descricao: t.descricao,
        tipo: t.tipo,
        status: t.status,
        prioridade: t.prioridade,
        horario: t.data_agendamento,
        lead_id: t.cvcrm_lead_id
      })),
      visitas: result.visitas.map((v: any) => ({
        id: v.cvcrm_id,
        lead_id: v.cvcrm_lead_id,
        empreendimento: v.empreendimento_nome,
        horario: v.data_agendamento,
        status: v.status,
        observacoes: v.observacoes,
        corretor: v.corretor_nome
      })),
      agendamentos: result.agendamentos.map((a: any) => ({
        id: a.cvcrm_id,
        titulo: a.titulo,
        descricao: a.descricao,
        tipo: a.tipo,
        inicio: a.data_inicio,
        fim: a.data_fim,
        local: a.local,
        status: a.status
      }))
    }
  }
}

/**
 * Get overdue tasks
 */
const get_tarefas_atrasadas: VoiceAgentToolDefinition = {
  name: 'get_tarefas_atrasadas',
  description: 'Obtém as tarefas atrasadas, ou seja, tarefas com data de vencimento anterior a hoje e que ainda não foram concluídas.',
  parameters: {
    type: 'object',
    properties: {
      corretor_id: {
        type: 'number',
        description: 'ID do corretor para filtrar tarefas (opcional)'
      }
    }
  },
  execute: async (args: Record<string, any>, workspaceId: number) => {
    const { corretor_id } = args

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let query = `
      SELECT
        cvcrm_id,
        titulo,
        descricao,
        tipo,
        status,
        prioridade,
        data_agendamento,
        cvcrm_lead_id,
        responsavel_nome
      FROM cvcrm_lead_tarefas
      WHERE workspace_id = $1
        AND data_agendamento < $2
        AND status != 'concluida'
    `
    const params: any[] = [workspaceId, today.toISOString()]

    if (corretor_id) {
      query += ` AND responsavel_id = $3`
      params.push(corretor_id)
    }

    query += ` ORDER BY data_agendamento ASC LIMIT 100`

    const result = await dbQuery(query, params)

    // Calculate days overdue for each task
    const tarefas = result.rows.map((t: any) => {
      const dueDate = new Date(t.data_agendamento)
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: t.cvcrm_id,
        titulo: t.titulo,
        descricao: t.descricao,
        tipo: t.tipo,
        status: t.status,
        prioridade: t.prioridade,
        data_vencimento: t.data_agendamento,
        dias_atraso: daysOverdue,
        lead_id: t.cvcrm_lead_id,
        responsavel: t.responsavel_nome
      }
    })

    return {
      count: tarefas.length,
      tarefas_atrasadas: tarefas
    }
  }
}

/**
 * Get pending commissions
 */
const get_comissoes_pendentes: VoiceAgentToolDefinition = {
  name: 'get_comissoes_pendentes',
  description: 'Obtém as comissões pendentes de pagamento, com valor total e detalhamento por venda/corretor.',
  parameters: {
    type: 'object',
    properties: {
      corretor_id: {
        type: 'number',
        description: 'ID do corretor para filtrar comissões (opcional)'
      }
    }
  },
  execute: async (args: Record<string, any>, workspaceId: number) => {
    const { corretor_id } = args

    let query = `
      SELECT
        cvcrm_id,
        tipo,
        corretor_id,
        corretor_nome,
        reserva_id,
        empreendimento_nome,
        percentual,
        valor,
        status,
        data_previsao
      FROM cvcrm_comissoes
      WHERE workspace_id = $1 AND status = 'pendente'
    `
    const params: any[] = [workspaceId]

    if (corretor_id) {
      query += ` AND corretor_id = $2`
      params.push(corretor_id)
    }

    query += ` ORDER BY data_previsao ASC LIMIT 100`

    const result = await dbQuery(query, params)

    // Calculate totals
    const totalPendente = result.rows.reduce((sum: number, c: any) => sum + (parseFloat(c.valor) || 0), 0)

    // Group by corretor
    const porCorretor: Record<string, { nome: string; total: number; quantidade: number }> = {}
    result.rows.forEach((c: any) => {
      const corretorKey = c.corretor_id || 'sem_corretor'
      if (!porCorretor[corretorKey]) {
        porCorretor[corretorKey] = {
          nome: c.corretor_nome || 'Sem corretor',
          total: 0,
          quantidade: 0
        }
      }
      porCorretor[corretorKey].total += parseFloat(c.valor) || 0
      porCorretor[corretorKey].quantidade++
    })

    return {
      total_pendente: totalPendente,
      total_pendente_formatado: `R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      quantidade_comissoes: result.rows.length,
      por_corretor: Object.values(porCorretor).map(c => ({
        ...c,
        total_formatado: `R$ ${c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      })),
      comissoes: result.rows.map((c: any) => ({
        id: c.cvcrm_id,
        tipo: c.tipo,
        corretor: c.corretor_nome,
        empreendimento: c.empreendimento_nome,
        percentual: c.percentual,
        valor: c.valor,
        valor_formatado: `R$ ${parseFloat(c.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        data_previsao: c.data_previsao
      }))
    }
  }
}

/**
 * Get stats per development (empreendimento)
 */
const get_empreendimento_stats: VoiceAgentToolDefinition = {
  name: 'get_empreendimento_stats',
  description: 'Obtém estatísticas por empreendimento, incluindo leads, reservas e vendas. Pode filtrar por empreendimento específico ou retornar todos.',
  parameters: {
    type: 'object',
    properties: {
      empreendimento_id: {
        type: 'number',
        description: 'ID do empreendimento para filtrar (opcional, se não informado retorna todos)'
      }
    }
  },
  execute: async (args: Record<string, any>, workspaceId: number) => {
    const { empreendimento_id } = args

    // Get empreendimentos list
    let empreendimentosQuery = `
      SELECT
        cvcrm_id,
        nome,
        tipo,
        status,
        cidade,
        uf,
        total_unidades
      FROM cvcrm_empreendimentos
      WHERE workspace_id = $1
    `
    const empreendimentosParams: any[] = [workspaceId]

    if (empreendimento_id) {
      empreendimentosQuery += ` AND cvcrm_id = $2`
      empreendimentosParams.push(empreendimento_id)
    }

    empreendimentosQuery += ` ORDER BY nome ASC LIMIT 50`

    const empreendimentosResult = await dbQuery(empreendimentosQuery, empreendimentosParams)

    // Get stats for each empreendimento
    const stats = await Promise.all(
      empreendimentosResult.rows.map(async (emp: any) => {
        // Count leads (from JSON empreendimento field)
        const leadsResult = await dbQuery(`
          SELECT COUNT(*) as total
          FROM cvcrm_leads
          WHERE workspace_id = $1 AND empreendimento::text LIKE $2
        `, [workspaceId, `%"id":${emp.cvcrm_id}%`])

        // Count reservas
        const reservasResult = await dbQuery(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'ativa') as ativas,
            SUM(CASE WHEN status = 'ativa' THEN valor_reserva ELSE 0 END) as valor_ativas
          FROM cvcrm_reservas
          WHERE workspace_id = $1 AND empreendimento_id = $2
        `, [workspaceId, emp.cvcrm_id])

        // Count vendas
        const vendasResult = await dbQuery(`
          SELECT
            COUNT(*) as total,
            SUM(valor_venda) as valor_total
          FROM cvcrm_vendas
          WHERE workspace_id = $1 AND empreendimento_id = $2
        `, [workspaceId, emp.cvcrm_id])

        // Get unidades stats
        const unidadesResult = await dbQuery(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE situacao = 'disponivel') as disponiveis,
            COUNT(*) FILTER (WHERE situacao = 'reservada') as reservadas,
            COUNT(*) FILTER (WHERE situacao = 'vendida') as vendidas
          FROM cvcrm_unidades
          WHERE workspace_id = $1 AND empreendimento_id = $2
        `, [workspaceId, emp.cvcrm_id])

        return {
          empreendimento: {
            id: emp.cvcrm_id,
            nome: emp.nome,
            tipo: emp.tipo,
            status: emp.status,
            cidade: emp.cidade,
            uf: emp.uf
          },
          leads: {
            total: parseInt(leadsResult.rows[0]?.total || 0)
          },
          reservas: {
            total: parseInt(reservasResult.rows[0]?.total || 0),
            ativas: parseInt(reservasResult.rows[0]?.ativas || 0),
            valor_ativas: parseFloat(reservasResult.rows[0]?.valor_ativas || 0)
          },
          vendas: {
            total: parseInt(vendasResult.rows[0]?.total || 0),
            valor_total: parseFloat(vendasResult.rows[0]?.valor_total || 0)
          },
          unidades: {
            total: parseInt(unidadesResult.rows[0]?.total || 0) || emp.total_unidades,
            disponiveis: parseInt(unidadesResult.rows[0]?.disponiveis || 0),
            reservadas: parseInt(unidadesResult.rows[0]?.reservadas || 0),
            vendidas: parseInt(unidadesResult.rows[0]?.vendidas || 0)
          }
        }
      })
    )

    // Calculate totals across all empreendimentos
    const totais = {
      empreendimentos: stats.length,
      leads: stats.reduce((sum, s) => sum + s.leads.total, 0),
      reservas_ativas: stats.reduce((sum, s) => sum + s.reservas.ativas, 0),
      vendas: stats.reduce((sum, s) => sum + s.vendas.total, 0),
      valor_vendas: stats.reduce((sum, s) => sum + s.vendas.valor_total, 0),
      unidades_disponiveis: stats.reduce((sum, s) => sum + s.unidades.disponiveis, 0)
    }

    return {
      totais: {
        ...totais,
        valor_vendas_formatado: `R$ ${totais.valor_vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      },
      empreendimentos: stats.map(s => ({
        ...s,
        reservas: {
          ...s.reservas,
          valor_ativas_formatado: `R$ ${s.reservas.valor_ativas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        },
        vendas: {
          ...s.vendas,
          valor_total_formatado: `R$ ${s.vendas.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        }
      }))
    }
  }
}

/**
 * Export all atendimentos tools
 */
export const ATENDIMENTOS_TOOLS: VoiceAgentToolDefinition[] = [
  get_atendimentos_pendentes,
  get_cliente_historico,
  get_agenda_hoje,
  get_tarefas_atrasadas,
  get_comissoes_pendentes,
  get_empreendimento_stats
]
