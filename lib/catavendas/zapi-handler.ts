// CataVendas Z-API Handler
// Routes corretor/admin messages through CataVendas AI via Z-API

import { sendTextMessage } from '@/lib/zapi';
import { detectIntent, extractLeadNameFromMessage, isFollowUpConfirmation, isGreeting } from './intent';
import { generateResponse, generateFollowUpMessage } from './ai';
import { 
  scanColdLeads, 
  listProperties, 
  getMyLeads, 
  getPipelineStatus, 
  getLeadDetail,
  getLeadConversation
} from './actions';
import { CataVendasContext, Corretor, CataVendasIntent } from './types';
import { dbQuery } from '@/lib/db';

interface ZAPIUser {
  id: string;
  nome: string;
  telefone: string;
  role: string;
  cvcrm_id?: number;
  evolution_instance_name?: string;
}

/**
 * Process a CataVendas message received via Z-API webhook
 */
export async function processCataVendasZAPI(
  phone: string,
  messageText: string,
  user: ZAPIUser
): Promise<void> {
  console.log(`[CataVendas Z-API] Processing message from ${user.nome || phone}: "${messageText}"`);

  try {
    // Build corretor context
    const corretor: Corretor = {
      id: user.id,
      name: user.nome || '',
      nome: user.nome || '',
      telefone: user.telefone || phone,
      phone: phone,
      evolution_instance_name: user.evolution_instance_name || '',
      role: user.role,
      cvcrm_id: user.cvcrm_id?.toString(),
    };

    // Handle greetings
    if (isGreeting(messageText)) {
      const name = corretor.name || corretor.nome || 'parceiro';
      const firstName = name.split(' ')[0];
      await sendTextMessage(phone, `E aí, ${firstName}! Sou o *CataVendas* 🔥\n\nDigita *cata* que eu escavo seus leads e acho negócio perdido. Ou me pergunta qualquer coisa sobre seus leads, imóveis ou pipeline!`);
      return;
    }

    // Detect intent
    const intent = detectIntent(messageText) as CataVendasIntent;
    console.log(`[CataVendas Z-API] Intent: ${intent}`);

    // Build context
    const context: CataVendasContext = {
      corretor,
      workspaceId: 1,
      instanceName: corretor.evolution_instance_name,
      userMessage: messageText,
      intent,
      data: {},
    };

    // Execute action based on intent
    switch (intent) {
      case 'catavendas_scan': {
        const result = await scanColdLeads(corretor);
        context.data = { coldLeads: result.data || [] };
        break;
      }
      case 'list_properties': {
        const result = await listProperties();
        context.data = { properties: result.data || [] };
        break;
      }
      case 'my_leads': {
        const result = await getMyLeads(corretor);
        context.data = { leads: result.data || [] };
        break;
      }
      case 'pipeline_status': {
        const result = await getPipelineStatus(corretor);
        context.data = { pipeline: result.data || [] };
        break;
      }
      case 'lead_detail': {
        const leadName = extractLeadNameFromMessage(messageText);
        if (leadName) {
          const result = await getLeadDetail(corretor, leadName);
          context.data = { leadDetail: result.data };
        }
        break;
      }
      default: {
        // General help - provide some context
        const leadsResult = await getMyLeads(corretor);
        context.data = { leads: (leadsResult.data || []).slice(0, 5) };
        break;
      }
    }

    // Generate AI response
    const response = await generateResponse(context);
    
    // Send via Z-API
    await sendTextMessage(phone, response);
    console.log(`[CataVendas Z-API] Response sent to ${phone}`);

  } catch (error) {
    console.error('[CataVendas Z-API] Error:', error);
    await sendTextMessage(phone, 'Opa, tive um probleminha aqui. Tenta de novo em alguns segundos! 🤖');
  }
}
