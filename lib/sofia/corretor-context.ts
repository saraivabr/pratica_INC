/**
 * Context Builder for Sofia AI Assistant
 * 
 * Fetches corretor context to enable proactive responses
 */

import { dbQuery } from '@/lib/db';

export interface CorretorContext {
  leadSummary: Array<{ situacao_nome: string; total: number }>;
  pendingLeads: Array<{ nome: string; telefone: string; situacao_nome: string; data_cad: string }>;
  recentWins: Array<{ nome: string; situacao_nome: string; empreendimentos: string }>;
  propertiesCount: number;
  properties: Array<{ nome: string; estoque: number; preco_minimo: number; fase: string }>;
}

/**
 * Get comprehensive context for a corretor to enable proactive responses
 */
export async function getCorretorContext(userId: string, userName: string, userRole?: string): Promise<CorretorContext> {
  try {
    // For admin users, show ALL leads (no corretor filter)
    const isAdmin = userRole === 'admin' || userRole === 'gerente';
    
    // Get lead summary by status
    const leadSummaryQuery = isAdmin ? `
      SELECT situacao_nome, COUNT(*) as total FROM cvcrm_leads 
      GROUP BY situacao_nome ORDER BY total DESC
    ` : `
      SELECT situacao_nome, COUNT(*) as total FROM cvcrm_leads 
      WHERE corretor_id::text = $1 OR corretor_nome ILIKE $2
      GROUP BY situacao_nome ORDER BY total DESC
    `;
    
    const leadSummaryParams = isAdmin ? [] : [userId, `%${userName}%`];
    const leadSummary = await dbQuery(leadSummaryQuery, leadSummaryParams);
    
    // Get pending leads (need attention)
    const pendingLeadsQuery = isAdmin ? `
      SELECT nome, telefone, situacao_nome, data_cad FROM cvcrm_leads
      WHERE situacao_nome IN ('Aguardando Atendimento', 'Aguardando Atendimento Corretor')
      ORDER BY data_cad DESC LIMIT 5
    ` : `
      SELECT nome, telefone, situacao_nome, data_cad FROM cvcrm_leads
      WHERE (corretor_id::text = $1 OR corretor_nome ILIKE $2)
      AND situacao_nome IN ('Aguardando Atendimento', 'Aguardando Atendimento Corretor')
      ORDER BY data_cad DESC LIMIT 5
    `;
    
    const pendingLeadsParams = isAdmin ? [] : [userId, `%${userName}%`];
    const pendingLeads = await dbQuery(pendingLeadsQuery, pendingLeadsParams);
    
    // Get recent wins (last 7 days)
    const recentWinsQuery = isAdmin ? `
      SELECT nome, situacao_nome, empreendimentos FROM cvcrm_leads
      WHERE situacao_nome IN ('Com Reserva', 'Vendido', 'Venda Realizada')
      AND updated_at > NOW() - INTERVAL '7 days'
      ORDER BY updated_at DESC LIMIT 3
    ` : `
      SELECT nome, situacao_nome, empreendimentos FROM cvcrm_leads
      WHERE (corretor_id::text = $1 OR corretor_nome ILIKE $2)
      AND situacao_nome IN ('Com Reserva', 'Vendido', 'Venda Realizada')
      AND updated_at > NOW() - INTERVAL '7 days'
      ORDER BY updated_at DESC LIMIT 3
    `;
    
    const recentWinsParams = isAdmin ? [] : [userId, `%${userName}%`];
    const recentWins = await dbQuery(recentWinsQuery, recentWinsParams);
    
    // Get available properties with Órulo data (stock, price)
    const properties = await dbQuery(`
      SELECT nome, 
        COALESCE((cvcrm_data->>'stock')::int, 0) as estoque,
        COALESCE((cvcrm_data->>'min_price')::numeric, 0) as preco_minimo,
        cvcrm_data->>'stage' as fase
      FROM cvcrm_empreendimentos 
      WHERE status = 'ativo' 
        AND COALESCE((cvcrm_data->>'stock')::int, 0) > 0
      ORDER BY COALESCE((cvcrm_data->>'stock')::int, 0) DESC
      LIMIT 10
    `, []);
    
    return {
      leadSummary: leadSummary.rows || [],
      pendingLeads: pendingLeads.rows || [],
      recentWins: recentWins.rows || [],
      propertiesCount: properties.rows?.length || 0,
      properties: properties.rows || [],
    };
  } catch (error) {
    console.error('[Sofia Context] Error fetching corretor context:', error);
    // Return empty context on error to not break the flow
    return {
      leadSummary: [],
      pendingLeads: [],
      recentWins: [],
      propertiesCount: 0
    };
  }
}

/**
 * Build a proactive greeting message using corretor context
 */
export function buildProactiveGreeting(
  userName: string, 
  isReturn: boolean,
  context: CorretorContext
): { message: string; contextSummary: string } {
  const { leadSummary, pendingLeads, recentWins, propertiesCount } = context;
  
  // Calculate totals
  const totalLeads = leadSummary.reduce((sum, item) => sum + parseInt(item.total.toString()), 0);
  const pendingCount = pendingLeads.length;
  
  // Build context summary for AI
  let contextSummary = '';
  
  if (pendingCount > 0) {
    const pendingNames = pendingLeads.slice(0, 3).map(lead => lead.nome).join(', ');
    contextSummary += `${pendingCount} leads aguardando atendimento: ${pendingNames}. `;
  }
  
  if (recentWins.length > 0) {
    const winText = recentWins.map(win => `${win.nome} (${win.situacao_nome})`).join(', ');
    contextSummary += `Vendas recentes: ${winText}. `;
  }
  
  if (totalLeads > 0) {
    contextSummary += `${totalLeads} leads ativos no funil. `;
  }
  
  contextSummary += `${propertiesCount} empreendimentos ativos.`;
  
  // For simple cases, return a basic greeting without context
  // The AI will use the contextSummary to build a proactive response
  const greeting = isReturn ? 
    `Oi, ${userName}! Bem-vindo de volta! 😊` : 
    `Olá, ${userName}! Como posso te ajudar hoje?`;
  
  return { message: greeting, contextSummary };
}