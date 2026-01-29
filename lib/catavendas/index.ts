// CataVendas Main Engine

import { sendTextMessage } from '@/lib/evolution-api';
import { dbQuery } from '@/lib/db';
import { 
  CataVendasContext, 
  Corretor, 
  CataVendasIntent,
  ActionResult 
} from './types';
import { detectIntent, extractLeadNameFromMessage, isFollowUpConfirmation, isGreeting } from './intent';
import { generateResponse, generateFollowUpMessage } from './ai';
import { 
  scanColdLeads, 
  listProperties, 
  getMyLeads, 
  getPipelineStatus, 
  getLeadDetail,
  getLeadConversation,
  findLeadByPhone
} from './actions';

// Main function called from webhook
export async function processCataVendasMessage(
  instanceName: string,
  corretorPhone: string,
  messageText: string,
  workspaceId: number,
  corretorData?: any
): Promise<void> {
  try {
    console.log(`[CataVendas] Processing message from ${corretorPhone}: "${messageText}"`);

    // Get corretor info if not provided
    let corretor: Corretor;
    if (corretorData) {
      corretor = corretorData;
    } else {
      const result = await dbQuery(
        `SELECT id, name, nome, telefone, phone, evolution_instance_name, workspace_id, role, cvcrm_id 
         FROM users 
         WHERE (telefone = $1 OR phone = $1) AND role IN ('corretor', 'admin', 'gerente') 
         LIMIT 1`,
        [corretorPhone]
      );

      if (result.rows.length === 0) {
        console.log(`[CataVendas] Corretor not found: ${corretorPhone}`);
        return;
      }

      corretor = result.rows[0];
    }

    // Handle greeting
    if (isGreeting(messageText)) {
      await sendWelcomeMessage(instanceName, corretorPhone, corretor);
      return;
    }

    // Detect intent
    const intent = detectIntent(messageText);
    console.log(`[CataVendas] Detected intent: ${intent}`);

    // Build context
    const context: CataVendasContext = {
      corretor,
      workspaceId,
      instanceName,
      userMessage: messageText,
      intent
    };

    // Execute action based on intent
    await executeAction(context, intent);

  } catch (error) {
    console.error('[CataVendas] Error processing message:', error);
    await sendTextMessage(instanceName, {
      number: corretorPhone,
      text: 'Opa, rolou um erro aqui. Tenta de novo em alguns segundos! 🤖'
    });
  }
}

async function executeAction(context: CataVendasContext, intent: CataVendasIntent): Promise<void> {
  let actionResult: ActionResult | null = null;

  try {
    switch (intent) {
      case 'catavendas_scan':
        actionResult = await scanColdLeads(context.corretor);
        context.data = { coldLeads: actionResult.data || [] };
        break;

      case 'list_properties':
        actionResult = await listProperties();
        context.data = { properties: actionResult.data || [] };
        break;

      case 'my_leads':
        actionResult = await getMyLeads(context.corretor);
        context.data = { leads: actionResult.data || [] };
        break;

      case 'pipeline_status':
        actionResult = await getPipelineStatus(context.corretor);
        context.data = { pipeline: actionResult.data || [] };
        break;

      case 'lead_detail':
        const leadName = extractLeadNameFromMessage(context.userMessage);
        if (leadName) {
          actionResult = await getLeadDetail(context.corretor, leadName);
          context.data = { leadDetail: actionResult.data };
        }
        break;

      case 'generate_followup':
        await handleFollowUpRequest(context);
        return; // Early return as this handles its own response

      case 'general_help':
      default:
        // No specific data needed, AI will provide general help
        break;
    }

    // Generate and send AI response
    const aiResponse = await generateResponse(context);
    await sendTextMessage(context.instanceName, {
      number: context.corretor.telefone || context.corretor.phone,
      text: aiResponse
    });

  } catch (error) {
    console.error('[CataVendas] Error executing action:', error);
    await sendTextMessage(context.instanceName, {
      number: context.corretor.telefone || context.corretor.phone,
      text: 'Deu uma travada aqui. Manda a mensagem de novo! 😅'
    });
  }
}

async function handleFollowUpRequest(context: CataVendasContext): Promise<void> {
  const leadName = extractLeadNameFromMessage(context.userMessage);
  
  if (!leadName) {
    await sendTextMessage(context.instanceName, {
      number: context.corretor.telefone || context.corretor.phone,
      text: 'Qual lead você quer que eu recupere? Manda o nome da pessoa 📱'
    });
    return;
  }

  // Get lead details and conversation history
  const leadResult = await getLeadDetail(context.corretor, leadName);
  
  if (!leadResult.success || !leadResult.data) {
    await sendTextMessage(context.instanceName, {
      number: context.corretor.telefone || context.corretor.phone,
      text: `Não achei o lead *${leadName}* na sua base. Confere o nome aí 🔍`
    });
    return;
  }

  const lead = leadResult.data;
  const phoneNumber = lead.telefone || lead.celular;
  
  if (!phoneNumber) {
    await sendTextMessage(context.instanceName, {
      number: context.corretor.telefone || context.corretor.phone,
      text: `O lead *${leadName}* não tem telefone cadastrado. Não consigo mandar mensagem 📱`
    });
    return;
  }

  // Get conversation history
  const conversations = await getLeadConversation(context.corretor, phoneNumber);
  
  // Generate follow-up message
  const followUpMessage = await generateFollowUpMessage(leadName, conversations, lead);
  
  // Send suggested message for confirmation
  const confirmationText = `Vou mandar essa mensagem pro *${leadName}*:

"${followUpMessage}"

*Confirma?* (sim/não)`;

  await sendTextMessage(context.instanceName, {
    number: context.corretor.telefone || context.corretor.phone,
    text: confirmationText
  });

  // Store the pending follow-up in a simple way (could be improved with Redis/DB)
  // For now, the next message from this corretor will be checked for confirmation
  console.log(`[CataVendas] Awaiting confirmation for follow-up to ${leadName} (${phoneNumber})`);
}

async function sendWelcomeMessage(instanceName: string, corretorPhone: string, corretor: Corretor): Promise<void> {
  const welcomeText = `E aí, *${corretor.name || corretor.nome}*! 👋

Sou o *CataVendas*, seu assistente de vendas. Posso te ajudar a:

🔥 *Encontrar leads que esfriaram* 
📱 *Sugerir mensagens de follow-up*
📊 *Ver seu funil de vendas*
🏠 *Listar imóveis disponíveis*

Só mandar "cata vendas" que eu busco leads perdidos pra você!`;

  await sendTextMessage(instanceName, {
    number: corretorPhone,
    text: welcomeText
  });
}

// Helper function to check if message is a follow-up confirmation
export async function handleFollowUpConfirmation(
  instanceName: string,
  corretorPhone: string,
  messageText: string,
  pendingFollowUp: any
): Promise<boolean> {
  if (isFollowUpConfirmation(messageText)) {
    try {
      // Send the follow-up message to the lead
      await sendTextMessage(instanceName, {
        number: pendingFollowUp.leadPhone,
        text: pendingFollowUp.message
      });

      // Confirm to corretor
      await sendTextMessage(instanceName, {
        number: corretorPhone,
        text: `✅ Mensagem enviada pro *${pendingFollowUp.leadName}*! 

Agora é só aguardar a resposta. Boa sorte! 🔥`
      });

      return true;
    } catch (error) {
      console.error('[CataVendas] Error sending follow-up:', error);
      await sendTextMessage(instanceName, {
        number: corretorPhone,
        text: 'Deu erro pra enviar a mensagem. Tenta de novo! 😅'
      });
      return true; // Still handled
    }
  }

  // Check for rejection
  const rejectionWords = ['não', 'nao', 'cancela', 'para'];
  if (rejectionWords.some(word => messageText.toLowerCase().includes(word))) {
    await sendTextMessage(instanceName, {
      number: corretorPhone,
      text: 'Ok, cancelei o follow-up. Se precisar de outra mensagem, é só pedir! 👍'
    });
    return true;
  }

  return false; // Not a confirmation
}

// API endpoint functions
export async function scanLeadsForInstance(instanceName: string): Promise<any> {
  try {
    // Find corretor by instance
    const result = await dbQuery(
      `SELECT id, name, nome, telefone, phone, evolution_instance_name, role, cvcrm_id 
       FROM users 
       WHERE evolution_instance_name = $1 AND role IN ('corretor', 'admin', 'gerente') 
       LIMIT 1`,
      [instanceName]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Corretor not found for instance' };
    }

    const corretor = result.rows[0];
    const scanResult = await scanColdLeads(corretor);

    return {
      success: scanResult.success,
      data: scanResult.data,
      corretor: {
        name: corretor.name || corretor.nome,
        instanceName: corretor.evolution_instance_name
      }
    };

  } catch (error) {
    console.error('[CataVendas] Error in scanLeadsForInstance:', error);
    return { success: false, error: 'Internal error' };
  }
}

export async function processApiMessage(instanceName: string, message: string): Promise<any> {
  try {
    // Find corretor by instance
    const result = await dbQuery(
      `SELECT id, name, nome, telefone, phone, evolution_instance_name, workspace_id, role, cvcrm_id
       FROM users 
       WHERE evolution_instance_name = $1 AND role IN ('corretor', 'admin', 'gerente') 
       LIMIT 1`,
      [instanceName]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'Corretor not found for instance' };
    }

    const corretor = result.rows[0];
    const intent = detectIntent(message);

    const context: CataVendasContext = {
      corretor,
      workspaceId: corretor.workspace_id || 1,
      instanceName,
      userMessage: message,
      intent
    };

    // Execute action
    let actionResult: ActionResult | null = null;

    switch (intent) {
      case 'catavendas_scan':
        actionResult = await scanColdLeads(corretor);
        context.data = { coldLeads: actionResult.data || [] };
        break;
      case 'my_leads':
        actionResult = await getMyLeads(corretor);
        context.data = { leads: actionResult.data || [] };
        break;
      case 'pipeline_status':
        actionResult = await getPipelineStatus(corretor);
        context.data = { pipeline: actionResult.data || [] };
        break;
      default:
        break;
    }

    // Generate AI response
    const aiResponse = await generateResponse(context);

    return {
      success: true,
      response: aiResponse,
      intent,
      data: context.data
    };

  } catch (error) {
    console.error('[CataVendas] Error in processApiMessage:', error);
    return { success: false, error: 'Internal error' };
  }
}