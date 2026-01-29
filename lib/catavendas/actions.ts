// CataVendas Action Handlers

import { dbQuery } from '@/lib/db';
import { ActionResult, ColdLead, Lead, Property, PipelineStatus, Corretor, ConversationMessage } from './types';

export async function scanColdLeads(corretor: Corretor): Promise<ActionResult> {
  try {
    // Admin sees all conversations, corretor sees only their instance
    const isAdmin = corretor.role === 'admin';
    const query = isAdmin ? `
      SELECT DISTINCT ON (wm.phone_number)
        wm.phone_number, wm.contact_name, wm.message_text as last_message,
        wm.timestamp as last_message_date, wm.is_from_me,
        EXTRACT(DAY FROM NOW() - wm.timestamp)::int as days_since_contact,
        l.nome as lead_name, l.situacao_nome, l.empreendimentos, l.valor_negocio
      FROM whatsapp_messages wm
      LEFT JOIN cvcrm_leads l ON l.telefone = wm.phone_number OR l.celular = wm.phone_number
      WHERE wm.phone_number ~ '^[0-9]{10,13}$'
        AND wm.timestamp < NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM whatsapp_messages wm2 
          WHERE wm2.phone_number = wm.phone_number 
          AND wm2.timestamp > NOW() - INTERVAL '7 days'
        )
      ORDER BY wm.phone_number, wm.timestamp DESC
      LIMIT 10
    ` : `
      SELECT DISTINCT ON (wm.phone_number)
        wm.phone_number, wm.contact_name, wm.message_text as last_message,
        wm.timestamp as last_message_date, wm.is_from_me,
        EXTRACT(DAY FROM NOW() - wm.timestamp)::int as days_since_contact,
        l.nome as lead_name, l.situacao_nome, l.empreendimentos, l.valor_negocio
      FROM whatsapp_messages wm
      LEFT JOIN cvcrm_leads l ON l.telefone = wm.phone_number OR l.celular = wm.phone_number
      WHERE wm.instance_name = $1
        AND wm.phone_number ~ '^[0-9]{10,13}$'
        AND wm.timestamp < NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM whatsapp_messages wm2 
          WHERE wm2.phone_number = wm.phone_number 
          AND wm2.instance_name = wm.instance_name
          AND wm2.timestamp > NOW() - INTERVAL '7 days'
        )
      ORDER BY wm.phone_number, wm.timestamp DESC
      LIMIT 10
    `;

    const params = corretor.role === 'admin' ? [] : [corretor.evolution_instance_name];
    const result = await dbQuery(query, params);
    
    return {
      success: true,
      data: result.rows as ColdLead[]
    };
  } catch (error) {
    console.error('[CataVendas] Error scanning cold leads:', error);
    return {
      success: false,
      error: 'Erro ao buscar leads esfriados',
      data: []
    };
  }
}

export async function listProperties(): Promise<ActionResult> {
  try {
    const query = `
      SELECT e.nome, e.cidade, e.uf, e.status, 
        COUNT(u.id) FILTER (WHERE u.situacao = 'Disponível') as disponiveis,
        COUNT(u.id) as total_unidades
      FROM cvcrm_empreendimentos e
      LEFT JOIN cvcrm_unidades u ON u.empreendimento_id = e.id
      GROUP BY e.id 
      ORDER BY e.nome
    `;

    const result = await dbQuery(query, []);
    
    return {
      success: true,
      data: result.rows as Property[]
    };
  } catch (error) {
    console.error('[CataVendas] Error listing properties:', error);
    return {
      success: false,
      error: 'Erro ao listar imóveis',
      data: []
    };
  }
}

export async function getMyLeads(corretor: Corretor): Promise<ActionResult> {
  try {
    const isAdmin = corretor.role === 'admin';
    const query = isAdmin ? `
      SELECT nome, telefone, celular, situacao_nome, empreendimentos, valor_negocio, data_cad
      FROM cvcrm_leads 
      ORDER BY data_cad DESC 
      LIMIT 20
    ` : `
      SELECT nome, telefone, celular, situacao_nome, empreendimentos, valor_negocio, data_cad
      FROM cvcrm_leads 
      WHERE (corretor_id::text = $1 OR corretor_nome ILIKE $2)
      ORDER BY data_cad DESC 
      LIMIT 20
    `;

    const params = isAdmin ? [] : [corretor.cvcrm_id || corretor.id, `%${corretor.name || corretor.nome}%`];
    const result = await dbQuery(query, params);
    
    return {
      success: true,
      data: result.rows as Lead[]
    };
  } catch (error) {
    console.error('[CataVendas] Error getting leads:', error);
    return {
      success: false,
      error: 'Erro ao buscar seus leads',
      data: []
    };
  }
}

export async function getPipelineStatus(corretor: Corretor): Promise<ActionResult> {
  try {
    const isAdmin = corretor.role === 'admin';
    const query = isAdmin ? `
      SELECT situacao_nome, COUNT(*) as total 
      FROM cvcrm_leads
      GROUP BY situacao_nome 
      ORDER BY total DESC
    ` : `
      SELECT situacao_nome, COUNT(*) as total 
      FROM cvcrm_leads
      WHERE (corretor_id::text = $1 OR corretor_nome ILIKE $2)
      GROUP BY situacao_nome 
      ORDER BY total DESC
    `;

    const params = isAdmin ? [] : [corretor.cvcrm_id || corretor.id, `%${corretor.name || corretor.nome}%`];
    const result = await dbQuery(query, params);
    
    return {
      success: true,
      data: result.rows as PipelineStatus[]
    };
  } catch (error) {
    console.error('[CataVendas] Error getting pipeline status:', error);
    return {
      success: false,
      error: 'Erro ao buscar status do funil',
      data: []
    };
  }
}

export async function getLeadDetail(corretor: Corretor, leadName: string): Promise<ActionResult> {
  try {
    // First get lead info
    const leadQuery = `
      SELECT nome, telefone, celular, situacao_nome, empreendimentos, valor_negocio, data_cad
      FROM cvcrm_leads 
      WHERE (corretor_id = $1 OR corretor_nome = $2)
        AND LOWER(nome) LIKE LOWER($3)
      LIMIT 1
    `;

    const leadResult = await dbQuery(leadQuery, [
      corretor.id, 
      corretor.name || corretor.nome,
      `%${leadName}%`
    ]);

    if (leadResult.rows.length === 0) {
      return {
        success: false,
        error: `Lead "${leadName}" não encontrado`,
        data: null
      };
    }

    const lead = leadResult.rows[0] as Lead;

    // Get conversation history
    const conversationQuery = `
      SELECT message_text, timestamp, is_from_me, contact_name
      FROM whatsapp_messages
      WHERE instance_name = $1 
        AND (phone_number = $2 OR phone_number = $3)
      ORDER BY timestamp DESC
      LIMIT 20
    `;

    const conversationResult = await dbQuery(conversationQuery, [
      corretor.evolution_instance_name,
      lead.telefone || '',
      lead.celular || ''
    ]);

    return {
      success: true,
      data: {
        ...lead,
        conversations: conversationResult.rows as ConversationMessage[]
      }
    };
  } catch (error) {
    console.error('[CataVendas] Error getting lead detail:', error);
    return {
      success: false,
      error: 'Erro ao buscar detalhes do lead',
      data: null
    };
  }
}

export async function getLeadConversation(corretor: Corretor, phoneNumber: string): Promise<ConversationMessage[]> {
  try {
    const query = `
      SELECT message_text, timestamp, is_from_me, contact_name
      FROM whatsapp_messages
      WHERE instance_name = $1 AND phone_number = $2
      ORDER BY timestamp ASC
      LIMIT 50
    `;

    const result = await dbQuery(query, [corretor.evolution_instance_name, phoneNumber]);
    return result.rows as ConversationMessage[];
  } catch (error) {
    console.error('[CataVendas] Error getting conversation:', error);
    return [];
  }
}

export async function findLeadByPhone(phoneNumber: string): Promise<Lead | null> {
  try {
    const query = `
      SELECT nome, telefone, celular, situacao_nome, empreendimentos, valor_negocio, data_cad
      FROM cvcrm_leads 
      WHERE telefone = $1 OR celular = $1
      LIMIT 1
    `;

    const result = await dbQuery(query, [phoneNumber]);
    return result.rows.length > 0 ? result.rows[0] as Lead : null;
  } catch (error) {
    console.error('[CataVendas] Error finding lead by phone:', error);
    return null;
  }
}