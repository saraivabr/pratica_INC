/**
 * Voice Agent Leads Tools
 *
 * Ferramentas para o agente de voz consultar dados de leads.
 */

import { withTenant } from '../../tenant-context';
import type { VoiceAgentToolDefinition } from '../types';

// ============================================================================
// FERRAMENTA: get_leads_count
// Conta leads por status/periodo
// ============================================================================

async function executeGetLeadsCount(
  args: Record<string, any>,
  workspaceId: number
): Promise<any> {
  console.log('[Voice-Agent] get_leads_count:', args, 'workspaceId:', workspaceId);

  try {
    return await withTenant(workspaceId, async (client) => {
      const { status, periodo, origem } = args;

      // Build WHERE clauses
      const conditions: string[] = ['workspace_id = $1'];
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      // Filter by status
      if (status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      // Filter by origem
      if (origem) {
        conditions.push(`origem ILIKE $${paramIndex}`);
        params.push(`%${origem}%`);
        paramIndex++;
      }

      // Filter by periodo
      if (periodo) {
        let dateFilter = '';
        switch (periodo) {
          case 'hoje':
            dateFilter = `created_at >= CURRENT_DATE`;
            break;
          case 'semana':
            dateFilter = `created_at >= CURRENT_DATE - INTERVAL '7 days'`;
            break;
          case 'mes':
            dateFilter = `created_at >= CURRENT_DATE - INTERVAL '30 days'`;
            break;
          case 'ano':
            dateFilter = `created_at >= CURRENT_DATE - INTERVAL '365 days'`;
            break;
        }
        if (dateFilter) {
          conditions.push(dateFilter);
        }
      }

      const whereClause = conditions.join(' AND ');

      // Count total
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM cvcrm_leads WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Get breakdown by status if no specific status filter
      let breakdown: Record<string, number> = {};
      if (!status) {
        const breakdownResult = await client.query(
          `SELECT status, COUNT(*) as count
           FROM cvcrm_leads
           WHERE ${whereClause}
           GROUP BY status
           ORDER BY count DESC`,
          params
        );
        breakdown = breakdownResult.rows.reduce((acc: Record<string, number>, row: any) => {
          acc[row.status || 'sem_status'] = parseInt(row.count, 10);
          return acc;
        }, {});
      }

      // Build response message
      let message = `Total de ${total} leads`;
      if (status) message += ` com status "${status}"`;
      if (periodo) message += ` no periodo: ${periodo}`;
      if (origem) message += ` da origem "${origem}"`;

      return {
        total,
        breakdown,
        filters: { status, periodo, origem },
        message
      };
    });
  } catch (error) {
    console.error('[Voice-Agent] Erro em get_leads_count:', error);
    return {
      total: 0,
      breakdown: {},
      message: 'Erro ao contar leads. Tente novamente.'
    };
  }
}

// ============================================================================
// FERRAMENTA: get_lead_details
// Busca detalhes de um lead especifico por nome ou telefone
// ============================================================================

async function executeGetLeadDetails(
  args: Record<string, any>,
  workspaceId: number
): Promise<any> {
  console.log('[Voice-Agent] get_lead_details:', args, 'workspaceId:', workspaceId);

  try {
    const { nome, telefone } = args;

    if (!nome && !telefone) {
      return {
        found: false,
        message: 'Informe o nome ou telefone do lead para buscar.'
      };
    }

    // Build WHERE clause
    const conditions: string[] = ['workspace_id = $1'];
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (nome) {
      conditions.push(`nome ILIKE $${paramIndex}`);
      params.push(`%${nome}%`);
      paramIndex++;
    }

    if (telefone) {
      // Clean phone number for comparison
      const cleanPhone = telefone.replace(/\D/g, '');
      conditions.push(`REPLACE(REPLACE(REPLACE(telefone, '-', ''), ' ', ''), '(', '') LIKE $${paramIndex}`);
      params.push(`%${cleanPhone}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await withTenant(workspaceId, async (client) => {
      return client.query(
        `SELECT
          id,
          nome,
          telefone,
          email,
          status,
          corretor,
          origem,
          created_at,
          updated_at
         FROM cvcrm_leads
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT 5`,
        params
      );
    });

    if (result.rows.length === 0) {
      return {
        found: false,
        lead: null,
        message: nome
          ? `Nenhum lead encontrado com o nome "${nome}".`
          : `Nenhum lead encontrado com o telefone "${telefone}".`
      };
    }

    // If multiple results, return the first but mention there are more
    const lead = result.rows[0];
    const totalFound = result.rows.length;

    const leadInfo = {
      id: lead.id,
      nome: lead.nome || 'Nao informado',
      telefone: lead.telefone || 'Nao informado',
      email: lead.email || 'Nao informado',
      status: lead.status || 'Nao definido',
      corretor: lead.corretor || 'Nao atribuido',
      origem: lead.origem || 'Nao informada',
      created_at: lead.created_at,
      updated_at: lead.updated_at
    };

    let message = `Lead encontrado: ${leadInfo.nome}`;
    if (leadInfo.telefone !== 'Nao informado') {
      message += `, telefone: ${leadInfo.telefone}`;
    }
    message += `, status: ${leadInfo.status}`;
    if (leadInfo.corretor !== 'Nao atribuido') {
      message += `, corretor: ${leadInfo.corretor}`;
    }

    if (totalFound > 1) {
      message += `. Encontrei ${totalFound} leads com esse criterio, mostrando o mais recente.`;
    }

    return {
      found: true,
      lead: leadInfo,
      totalFound,
      message
    };
  } catch (error) {
    console.error('[Voice-Agent] Erro em get_lead_details:', error);
    return {
      found: false,
      lead: null,
      message: 'Erro ao buscar lead. Tente novamente.'
    };
  }
}

// ============================================================================
// DEFINICAO DAS FERRAMENTAS
// ============================================================================

export const LEADS_TOOLS: VoiceAgentToolDefinition[] = [
  {
    name: 'get_leads_count',
    description: 'Conta o numero de leads filtrando por status, periodo ou origem. Use para obter estatisticas de leads.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Status do lead para filtrar (ex: novo, em_atendimento, convertido, perdido)'
        },
        periodo: {
          type: 'string',
          description: 'Periodo para filtrar os leads',
          enum: ['hoje', 'semana', 'mes', 'ano']
        },
        origem: {
          type: 'string',
          description: 'Origem do lead para filtrar (ex: site, facebook, indicacao)'
        }
      }
    },
    execute: executeGetLeadsCount
  },
  {
    name: 'get_lead_details',
    description: 'Busca detalhes de um lead especifico pelo nome ou telefone. Retorna informacoes como nome, telefone, email, status e corretor responsavel.',
    parameters: {
      type: 'object',
      properties: {
        nome: {
          type: 'string',
          description: 'Nome do lead para buscar (busca parcial)'
        },
        telefone: {
          type: 'string',
          description: 'Telefone do lead para buscar'
        }
      }
    },
    execute: executeGetLeadDetails
  }
];
