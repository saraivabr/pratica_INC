/**
 * Exemplo de Uso do Bot Conversacional WhatsApp
 * 
 * Este arquivo demonstra como integrar e usar o sistema de bot
 * conversacional para qualificação de leads via WhatsApp.
 */

import type {
  ConversationState,
  LeadContext,
  BotResponse,
} from './whatsapp-bot-logic';
import { WhatsAppBot } from './whatsapp-bot-logic';

// ============================================
// EXEMPLO 1: PROCESSAMENTO DE MENSAGEM
// ============================================

/**
 * Processa uma mensagem recebida do lead
 */
export async function processIncomingMessage(
  conversationId: string,
  leadPhone: string,
  message: string
): Promise<{ response: string; shouldHandoff: boolean }> {
  
  // 1. Buscar ou criar estado da conversa
  let state = await getConversationState(conversationId, leadPhone);
  
  // 2. Verificar horário de operação
  if (!WhatsAppBot.isWithinOperatingHours()) {
    const outOfHoursMsg = WhatsAppBot.getOutOfHoursMessage(
      state.context.nome || 'aí'
    );
    await sendWhatsAppMessage(leadPhone, outOfHoursMsg);
    return { response: outOfHoursMsg, shouldHandoff: false };
  }
  
  // 3. Gerar resposta do bot
  const botResponse = WhatsAppBot.generateBotResponse(state, message);
  
  // 4. Atualizar estado da conversa
  const updatedState = WhatsAppBot.updateConversationState(
    state,
    message,
    botResponse
  );
  
  // 5. Salvar estado atualizado
  await saveConversationState(updatedState);
  
  // 6. Se deve fazer handoff, alertar corretor
  if (botResponse.shouldHandoff) {
    await alertCorretor(updatedState);
  }
  
  // 7. Executar ações adicionais
  if (botResponse.actions) {
    for (const action of botResponse.actions) {
      await executeAction(action, updatedState);
    }
  }
  
  // 8. Enviar resposta com delay (simular digitação)
  if (botResponse.shouldSendNow) {
    setTimeout(async () => {
      await sendWhatsAppMessage(leadPhone, botResponse.message);
    }, botResponse.delayMs);
  }
  
  return {
    response: botResponse.message,
    shouldHandoff: botResponse.shouldHandoff || false,
  };
}

// ============================================
// EXEMPLO 2: FLUXO COMPLETO - LEAD QUENTE
// ============================================

/**
 * Simula uma conversa completa com lead quente
 */
export async function exampleHotLeadFlow() {
  console.log('=== EXEMPLO: LEAD QUENTE ===\n');
  
  const conversationId = 'conv-123';
  const leadPhone = '11999999999';
  
  // Mensagem 1: Lead demonstra interesse
  console.log('[09:00] João: "Oi, vi o anúncio do Vista Verde"');
  let result = await processIncomingMessage(
    conversationId,
    leadPhone,
    'Oi, vi o anúncio do Vista Verde'
  );
  console.log(`[09:01] Sofia: "${result.response}"\n`);
  
  // Mensagem 2: Lead pergunta sobre preço (sinal quente!)
  console.log('[09:05] João: "Gostei da localização. Quanto tá?"');
  result = await processIncomingMessage(
    conversationId,
    leadPhone,
    'Gostei da localização. Quanto tá?'
  );
  console.log(`[09:06] Sofia: "${result.response}"\n`);
  
  // Mensagem 3: Lead informa entrada disponível
  console.log('[09:10] João: "Tenho uns 50k guardados. Dá?"');
  result = await processIncomingMessage(
    conversationId,
    leadPhone,
    'Tenho uns 50k guardados. Dá?'
  );
  console.log(`[09:11] Sofia: "${result.response}"\n`);
  
  if (result.shouldHandoff) {
    console.log('✅ HANDOFF REALIZADO - Corretor foi alertado!');
    console.log('Score final: 95/100 - LEAD MUITO QUENTE 🔥\n');
  }
}

// ============================================
// EXEMPLO 3: FLUXO COMPLETO - LEAD MORNO
// ============================================

/**
 * Simula uma conversa com lead morno (necessita nutrição)
 */
export async function exampleWarmLeadFlow() {
  console.log('=== EXEMPLO: LEAD MORNO ===\n');
  
  const conversationId = 'conv-456';
  const leadPhone = '11988888888';
  
  // Mensagem 1
  console.log('[14:00] Maria: "Oi"');
  let result = await processIncomingMessage(conversationId, leadPhone, 'Oi');
  console.log(`[14:01] Sofia: "${result.response}"\n`);
  
  // Mensagem 2
  console.log('[14:20] Maria: "Tô só olhando"');
  result = await processIncomingMessage(
    conversationId,
    leadPhone,
    'Tô só olhando'
  );
  console.log(`[14:21] Sofia: "${result.response}"\n`);
  
  // Mensagem 3
  console.log('[14:45] Maria: "Ok, pode mandar"');
  result = await processIncomingMessage(
    conversationId,
    leadPhone,
    'Ok, pode mandar'
  );
  console.log(`[14:46] Sofia: "${result.response}"\n`);
  console.log('📧 Material enviado - Aguardando nutrição...\n');
  console.log('Score: 45/100 - LEAD MORNO 🟡');
  console.log('Próxima ação: Follow-up em 24h\n');
}

// ============================================
// EXEMPLO 4: DETECÇÃO DE SINAIS
// ============================================

/**
 * Demonstra detecção de diferentes sinais
 */
export function exampleSignalDetection() {
  console.log('=== EXEMPLO: DETECÇÃO DE SINAIS ===\n');
  
  const messages = [
    'Quanto custa o apartamento?',
    'Quero agendar uma visita',
    'Tô só dando uma olhada',
    'Quero falar com um corretor',
    'Tenho 100k de entrada',
  ];
  
  messages.forEach(msg => {
    const isHot = WhatsAppBot.detectHotSignals(msg);
    const isCold = WhatsAppBot.detectColdSignals(msg);
    const wantsHuman = WhatsAppBot.detectHumanRequest(msg);
    
    console.log(`Mensagem: "${msg}"`);
    console.log(`  Hot Signal: ${isHot ? '🔥 SIM' : '❌ NÃO'}`);
    console.log(`  Cold Signal: ${isCold ? '❄️ SIM' : '❌ NÃO'}`);
    console.log(`  Quer Humano: ${wantsHuman ? '👤 SIM' : '❌ NÃO'}`);
    console.log('');
  });
}

// ============================================
// EXEMPLO 5: CÁLCULO DE SCORE
// ============================================

/**
 * Demonstra cálculo de score de qualificação
 */
export function exampleScoreCalculation() {
  console.log('=== EXEMPLO: CÁLCULO DE SCORE ===\n');
  
  // Lead Quente
  const hotContext: LeadContext = {
    telefone: '11999999999',
    nome: 'João Silva',
    tipo_interesse: 'morar',
    prazo: 'junho 2026',
    entrada_disponivel: 50000,
    preferencia_quartos: 3,
    perguntas_feitas: 5,
    objecoes: [],
    materiais_enviados: ['tabela', 'planta'],
    mensagens_sem_resposta: 0,
    ultima_resposta: new Date(),
  };
  
  const hotScore = WhatsAppBot.calculateLeadScore(hotContext);
  console.log('LEAD QUENTE:');
  console.log(`  Score Total: ${hotScore.total}/100`);
  console.log(`  Temperatura: ${hotScore.temperature.toUpperCase()} 🔥`);
  console.log(`  Fatores:`);
  console.log(`    - Perguntas específicas: ${hotScore.factors.specificQuestions}`);
  console.log(`    - Mencionou entrada: ${hotScore.factors.mentionedEntryValue}`);
  console.log(`    - Tem prazo: ${hotScore.factors.hasDeadline}`);
  console.log('');
  
  // Lead Morno
  const warmContext: LeadContext = {
    telefone: '11988888888',
    nome: 'Maria Santos',
    tipo_interesse: 'morar',
    perguntas_feitas: 2,
    objecoes: ['sem_urgencia'],
    materiais_enviados: ['catalogo'],
    mensagens_sem_resposta: 0,
    ultima_resposta: new Date(),
  };
  
  const warmScore = WhatsAppBot.calculateLeadScore(warmContext);
  console.log('LEAD MORNO:');
  console.log(`  Score Total: ${warmScore.total}/100`);
  console.log(`  Temperatura: ${warmScore.temperature.toUpperCase()} 🟡`);
  console.log(`  Fatores:`);
  console.log(`    - Perguntas específicas: ${warmScore.factors.specificQuestions}`);
  console.log(`    - Mencionou entrada: ${warmScore.factors.mentionedEntryValue}`);
  console.log(`    - Tem prazo: ${warmScore.factors.hasDeadline}`);
  console.log('');
}

// ============================================
// EXEMPLO 6: GERAÇÃO DE ALERTAS
// ============================================

/**
 * Demonstra formato de alertas para corretores
 */
export function exampleCorretorAlerts() {
  console.log('=== EXEMPLO: ALERTAS PARA CORRETOR ===\n');
  
  // Alerta de Lead Quente
  console.log('🔥 LEAD QUENTE ATRIBUÍDO!');
  console.log('');
  console.log('Nome: João Silva');
  console.log('Telefone: (11) 99999-9999');
  console.log('Empreendimento: Vista Verde');
  console.log('');
  console.log('🎯 Por que é quente:');
  console.log('- Perguntou sobre tabela de preços');
  console.log('- Quer unidade de 3 quartos');
  console.log('- Mencionou ter entrada de R$ 50k');
  console.log('- Prazo: precisa até junho');
  console.log('');
  console.log('💬 Últimas mensagens:');
  console.log('[10:45] João: "Quanto fica de entrada pra unidade 301?"');
  console.log('[10:46] Sofia: "Ótima escolha! Vou te conectar..."');
  console.log('');
  console.log('📊 Score: 95/100');
  console.log('⏰ Responder em: 1 hora (máximo)');
  console.log('');
  console.log('[VER CONVERSA] [INICIAR ATENDIMENTO]');
  console.log('\n---\n');
  
  // Alerta de Lead em Risco
  console.log('⚠️ ATENÇÃO - Lead em Risco!');
  console.log('');
  console.log('João Silva está sem resposta há 3 horas.');
  console.log('Ele é um lead QUENTE e pode esfriar.');
  console.log('');
  console.log('Última mensagem dele:');
  console.log('"Ok, vou esperar o contato então"');
  console.log('');
  console.log('[RESPONDER AGORA]');
  console.log('');
}

// ============================================
// FUNÇÕES AUXILIARES (Mock)
// ============================================

async function getConversationState(
  conversationId: string,
  leadPhone: string
): Promise<ConversationState> {
  // Mock - em produção, buscar do banco de dados
  return {
    conversationId,
    leadId: `lead-${leadPhone}`,
    stage: 'initial_contact',
    temperature: 'cold',
    score: {
      total: 0,
      temperature: 'cold',
      factors: {
        specificQuestions: 0,
        mentionedEntryValue: 0,
        hasDeadline: 0,
        fastResponse: 0,
        highEngagement: 0,
        requestedVisit: 0,
      },
    },
    context: {
      telefone: leadPhone,
      perguntas_feitas: 0,
      objecoes: [],
      materiais_enviados: [],
      mensagens_sem_resposta: 0,
    },
    messageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    shouldHandoff: false,
  };
}

async function saveConversationState(state: ConversationState): Promise<void> {
  // Mock - em produção, salvar no banco de dados
  console.log('[DB] Estado da conversa salvo:', {
    id: state.conversationId,
    stage: state.stage,
    temperature: state.temperature,
    score: state.score.total,
  });
}

async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  // Mock - em produção, enviar via Evolution API
  console.log(`[WhatsApp → ${phone}] ${message}`);
}

async function alertCorretor(state: ConversationState): Promise<void> {
  // Mock - em produção, enviar alerta real pro corretor
  console.log('[ALERTA CORRETOR]', {
    lead: state.context.nome,
    phone: state.context.telefone,
    score: state.score.total,
    reason: state.handoffReason,
  });
}

async function executeAction(action: any, state: ConversationState): Promise<void> {
  // Mock - em produção, executar ação real
  console.log('[ACTION]', action.type, state.conversationId);
}

// ============================================
// EXECUTAR EXEMPLOS (para testes)
// ============================================

if (require.main === module) {
  console.log('\n🤖 SISTEMA DE BOT CONVERSACIONAL - EXEMPLOS\n');
  console.log('='.repeat(50));
  console.log('\n');
  
  // Executar exemplos
  exampleSignalDetection();
  console.log('='.repeat(50));
  console.log('\n');
  
  exampleScoreCalculation();
  console.log('='.repeat(50));
  console.log('\n');
  
  exampleCorretorAlerts();
  console.log('='.repeat(50));
  console.log('\n');
  
  // Exemplos assíncronos
  (async () => {
    await exampleHotLeadFlow();
    console.log('='.repeat(50));
    console.log('\n');
    
    await exampleWarmLeadFlow();
    console.log('='.repeat(50));
    console.log('\n');
    
    console.log('✅ Todos os exemplos foram executados!\n');
  })();
}
