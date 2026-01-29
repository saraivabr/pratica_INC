/**
 * Lógica de Bot Conversacional para WhatsApp
 * 
 * Sistema de IA para aquecimento, qualificação e transferência inteligente de leads.
 * Baseado no documento: docs/AI_CONVERSACIONAL_WHATSAPP.md
 */

// ============================================
// TIPOS E INTERFACES
// ============================================

export type LeadTemperature = 'hot' | 'warm' | 'cold' | 'frozen';

export type ConversationStage = 
  | 'initial_contact'      // Primeiro contato
  | 'warming_up'           // Aquecimento
  | 'qualification'        // Qualificação
  | 'nurturing'           // Nutrição
  | 'ready_handoff'       // Pronto para corretor
  | 'handed_off'          // Passado para corretor
  | 'follow_up'           // Follow-up sem resposta
  | 'frozen';             // Congelado

export interface LeadScore {
  total: number;                    // 0-100
  temperature: LeadTemperature;
  factors: {
    specificQuestions: number;      // 0-20 pontos
    mentionedEntryValue: number;    // 0-25 pontos
    hasDeadline: number;            // 0-20 pontos
    fastResponse: number;           // 0-10 pontos
    highEngagement: number;         // 0-15 pontos
    requestedVisit: number;         // 0-30 pontos
  };
}

export interface LeadContext {
  nome?: string;
  telefone: string;
  empreendimento?: string;
  tipo_interesse?: 'morar' | 'investir';
  prazo?: string;
  entrada_disponivel?: number;
  preferencia_quartos?: number;
  preferencia_metragem?: number;
  objecoes: string[];
  materiais_enviados: string[];
  perguntas_feitas: number;
  mensagens_sem_resposta: number;
  ultima_resposta?: Date;
}

export interface ConversationState {
  conversationId: string;
  leadId: string;
  stage: ConversationStage;
  temperature: LeadTemperature;
  score: LeadScore;
  context: LeadContext;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  shouldHandoff: boolean;
  handoffReason?: string;
}

export interface BotResponse {
  message: string;
  shouldSendNow: boolean;
  delayMs: number;
  nextStage?: ConversationStage;
  shouldHandoff?: boolean;
  handoffReason?: string;
  actions?: BotAction[];
}

export type BotAction = 
  | { type: 'send_material'; material: string }
  | { type: 'schedule_followup'; delayHours: number }
  | { type: 'update_context'; updates: Partial<LeadContext> }
  | { type: 'alert_corretor'; priority: 'urgent' | 'normal' | 'low' }
  | { type: 'freeze_lead' };

// ============================================
// CONSTANTES
// ============================================

const SCORE_THRESHOLDS = {
  HOT: 61,
  WARM: 31,
  COLD: 0,
};

const MAX_FOLLOW_UPS = 3;
const FOLLOW_UP_DELAYS = {
  FIRST: 4 * 60 * 60 * 1000,      // 4 horas
  SECOND: 24 * 60 * 60 * 1000,    // 24 horas
  THIRD: 48 * 60 * 60 * 1000,     // 48 horas
};

const MESSAGE_DELAYS = {
  MIN: 30 * 1000,     // 30 segundos
  MAX: 120 * 1000,    // 2 minutos
};

// Palavras-chave que indicam urgência/interesse alto
const HOT_KEYWORDS = [
  'preço', 'valor', 'tabela', 'quanto',
  'visita', 'agendar', 'conhecer', 'ver',
  'financiamento', 'crédito', 'banco',
  'entrada', 'parcela',
  'urgente', 'rápido', 'logo', 'hoje',
  'disponível', 'disponibilidade',
];

const COLD_SIGNALS = [
  'só olhando', 'só uma olhada', 'pesquisando',
  'não é pra agora', 'futuramente',
  'não tenho grana', 'não tenho dinheiro',
  'muito caro', 'tá caro demais',
];

// ============================================
// CÁLCULO DE SCORE
// ============================================

/**
 * Calcula o score de qualificação do lead baseado no contexto
 */
export function calculateLeadScore(context: LeadContext): LeadScore {
  const factors = {
    specificQuestions: Math.min(context.perguntas_feitas * 4, 20),
    mentionedEntryValue: context.entrada_disponivel ? 25 : 0,
    hasDeadline: context.prazo ? 20 : 0,
    fastResponse: calculateResponseSpeed(context),
    highEngagement: calculateEngagement(context),
    requestedVisit: checkVisitRequest(context) ? 30 : 0,
  };

  const total = Object.values(factors).reduce((sum, val) => sum + val, 0);
  
  const temperature: LeadTemperature = 
    total >= SCORE_THRESHOLDS.HOT ? 'hot' :
    total >= SCORE_THRESHOLDS.WARM ? 'warm' :
    total > 0 ? 'cold' : 'frozen';

  return { total, temperature, factors };
}

function calculateResponseSpeed(context: LeadContext): number {
  if (!context.ultima_resposta) return 5;
  
  const now = new Date();
  const diff = now.getTime() - context.ultima_resposta.getTime();
  const minutes = diff / (1000 * 60);
  
  if (minutes < 5) return 10;
  if (minutes < 15) return 7;
  if (minutes < 60) return 5;
  return 2;
}

function calculateEngagement(context: LeadContext): number {
  let score = 0;
  
  // Tipo de interesse definido
  if (context.tipo_interesse) score += 3;
  
  // Preferências especificadas
  if (context.preferencia_quartos) score += 3;
  if (context.preferencia_metragem) score += 3;
  
  // Materiais enviados e presumivelmente visualizados
  score += Math.min(context.materiais_enviados.length * 2, 6);
  
  return score;
}

function checkVisitRequest(context: LeadContext): boolean {
  // Checaria no histórico de mensagens se mencionou "visita" ou "agendar"
  // Por enquanto, simplificado
  return false;
}

// ============================================
// DETECÇÃO DE INTENÇÃO
// ============================================

/**
 * Detecta se a mensagem indica que o lead está quente
 */
export function detectHotSignals(message: string): boolean {
  const lowerMsg = message.toLowerCase();
  return HOT_KEYWORDS.some(keyword => lowerMsg.includes(keyword));
}

/**
 * Detecta se a mensagem indica desinteresse
 */
export function detectColdSignals(message: string): boolean {
  const lowerMsg = message.toLowerCase();
  return COLD_SIGNALS.some(signal => lowerMsg.includes(signal));
}

/**
 * Detecta se o lead quer falar com humano
 */
export function detectHumanRequest(message: string): boolean {
  const patterns = [
    /falar\s+com\s+(algu[eé]m|pessoa|humano|corretor|vendedor|atendente)/i,
    /quero\s+falar\s+com/i,
    /(voc[eê]\s+)?[eé]\s+(rob[oô]|bot|ia)/i,
    /me\s+transfere/i,
  ];
  
  return patterns.some(pattern => pattern.test(message));
}

/**
 * Extrai informações do contexto da mensagem
 */
export function extractContext(message: string): Partial<LeadContext> {
  const updates: Partial<LeadContext> = {};
  
  // Valor de entrada (ex: "tenho 50k", "entrada de 100 mil")
  const entradaMatch = message.match(/(\d+)\s*(k|mil|reais)?/i);
  if (entradaMatch) {
    let valor = parseInt(entradaMatch[1]);
    if (entradaMatch[2]?.match(/k|mil/i)) {
      valor *= 1000;
    }
    if (valor >= 10000) {
      updates.entrada_disponivel = valor;
    }
  }
  
  // Preferência de quartos (ex: "3 quartos", "2 qtos")
  const quartosMatch = message.match(/(\d+)\s*(quartos?|qtos?)/i);
  if (quartosMatch) {
    updates.preferencia_quartos = parseInt(quartosMatch[1]);
  }
  
  // Tipo de interesse
  if (/morar|moradia|casa\s+pr[oa]/i.test(message)) {
    updates.tipo_interesse = 'morar';
  } else if (/invest|aplicar|render/i.test(message)) {
    updates.tipo_interesse = 'investir';
  }
  
  return updates;
}

// ============================================
// DECISÃO DE HANDOFF
// ============================================

/**
 * Decide se deve passar o lead para o corretor
 */
export function shouldHandoffToCorretor(
  state: ConversationState,
  newMessage: string
): { should: boolean; reason?: string } {
  // 1. Lead pediu para falar com humano
  if (detectHumanRequest(newMessage)) {
    return { should: true, reason: 'pediu_falar_humano' };
  }
  
  // 2. Lead está muito quente (score >= 85)
  if (state.score.total >= 85) {
    return { should: true, reason: 'lead_muito_quente' };
  }
  
  // 3. Lead mencionou sinais quentes
  if (detectHotSignals(newMessage)) {
    // Incrementar contador de perguntas específicas
    const hotKeywordCount = HOT_KEYWORDS.filter(k => 
      newMessage.toLowerCase().includes(k)
    ).length;
    
    if (hotKeywordCount >= 2 || state.context.perguntas_feitas >= 3) {
      return { should: true, reason: 'interesse_alto_multiplos_sinais' };
    }
  }
  
  // 4. Lead está warm e já conversou por 2+ dias
  if (state.temperature === 'warm') {
    const daysSinceStart = (new Date().getTime() - state.createdAt.getTime()) 
      / (1000 * 60 * 60 * 24);
    
    if (daysSinceStart >= 2) {
      return { should: true, reason: 'warm_por_2_dias' };
    }
  }
  
  // 5. Lead mencionou valor de entrada alto
  if (state.context.entrada_disponivel && state.context.entrada_disponivel >= 50000) {
    return { should: true, reason: 'entrada_alta_disponivel' };
  }
  
  return { should: false };
}

// ============================================
// GERAÇÃO DE RESPOSTAS
// ============================================

/**
 * Gera a resposta apropriada baseado no estágio da conversa
 */
export function generateBotResponse(
  state: ConversationState,
  userMessage: string
): BotResponse {
  const stage = state.stage;
  const context = state.context;
  const nome = context.nome || 'aí';
  
  // Verificar se deve fazer handoff
  const handoffDecision = shouldHandoffToCorretor(state, userMessage);
  
  if (handoffDecision.should) {
    return generateHandoffMessage(nome, handoffDecision.reason!);
  }
  
  // Gerar resposta baseada no estágio
  switch (stage) {
    case 'initial_contact':
      return generateInitialResponse(nome, context);
      
    case 'warming_up':
      return generateWarmingResponse(nome, context, userMessage);
      
    case 'qualification':
      return generateQualificationResponse(nome, context, userMessage);
      
    case 'nurturing':
      return generateNurturingResponse(nome, context);
      
    case 'follow_up':
      return generateFollowUpResponse(nome, context);
      
    default:
      return generateDefaultResponse(nome);
  }
}

function generateInitialResponse(nome: string, context: LeadContext): BotResponse {
  const empreendimento = context.empreendimento || 'nossos empreendimentos';
  
  const messages = [
    `Oi ${nome}! 😊\nVi que você se interessou pelo ${empreendimento}.\n\nO que mais chamou sua atenção?`,
    `Oi ${nome}! 👋\nObrigada pelo interesse no ${empreendimento}!\n\nTem alguma dúvida específica que eu possa esclarecer?`,
    `E aí, ${nome}!\nVi seu interesse no ${empreendimento}. Legal!\n\nO que você tá buscando num imóvel?`,
  ];
  
  const message = messages[Math.floor(Math.random() * messages.length)];
  
  return {
    message,
    shouldSendNow: true,
    delayMs: randomDelay(),
    nextStage: 'warming_up',
  };
}

function generateWarmingResponse(
  nome: string, 
  context: LeadContext,
  userMessage: string
): BotResponse {
  // Detectar sinais frios
  if (detectColdSignals(userMessage)) {
    return {
      message: `Tranquilo, ${nome}! Tô aqui pra ajudar no que precisar.\n\nQuer que eu te mande o material completo pra você conhecer melhor?`,
      shouldSendNow: true,
      delayMs: randomDelay(),
      nextStage: 'nurturing',
      actions: [
        { type: 'update_context', updates: { objecoes: [...context.objecoes, 'sem_urgencia'] } },
      ],
    };
  }
  
  // Perguntas de qualificação suave
  if (!context.tipo_interesse) {
    return {
      message: `Legal! 😊\n\nVocê tá procurando pra morar ou investimento?`,
      shouldSendNow: true,
      delayMs: randomDelay(),
      nextStage: 'qualification',
    };
  }
  
  if (!context.prazo) {
    return {
      message: `Entendi! E você já tem ideia de quando pretende comprar?`,
      shouldSendNow: true,
      delayMs: randomDelay(),
      nextStage: 'qualification',
    };
  }
  
  return generateQualificationResponse(nome, context, userMessage);
}

function generateQualificationResponse(
  nome: string,
  context: LeadContext,
  userMessage: string
): BotResponse {
  // Se mencionou valor de entrada
  if (!context.entrada_disponivel) {
    return {
      message: `Bacana! Você já tem uma entrada em mente?`,
      shouldSendNow: true,
      delayMs: randomDelay(),
    };
  }
  
  // Se não tem preferência de quartos
  if (!context.preferencia_quartos) {
    return {
      message: `Perfeito! E sobre os quartos, você prefere 2 ou 3?`,
      shouldSendNow: true,
      delayMs: randomDelay(),
    };
  }
  
  // Lead já qualificado, oferecer próximo passo
  return {
    message: `Ótimo, ${nome}! Com essas informações já consigo te ajudar melhor 🎯\n\nQuer que eu te passe a tabela de preços ou prefere que um especialista te explique as condições?`,
    shouldSendNow: true,
    delayMs: randomDelay(),
    nextStage: 'ready_handoff',
  };
}

function generateNurturingResponse(nome: string, context: LeadContext): BotResponse {
  const messages = [
    `${nome}, mandei o material! 📄\n\nQualquer dúvida, é só chamar! 😊`,
    `Pronto, ${nome}! Material enviado.\n\nSe precisar de algo, tô aqui! 👍`,
  ];
  
  return {
    message: messages[Math.floor(Math.random() * messages.length)],
    shouldSendNow: true,
    delayMs: randomDelay(),
    actions: [
      { type: 'send_material', material: 'catalogo_completo' },
      { type: 'schedule_followup', delayHours: 24 },
    ],
  };
}

function generateFollowUpResponse(nome: string, context: LeadContext): BotResponse {
  const attempt = context.mensagens_sem_resposta;
  
  if (attempt === 1) {
    return {
      message: `${nome}, conseguiu ver minha mensagem?\n\nSe tiver qualquer dúvida, tô aqui! 😊`,
      shouldSendNow: true,
      delayMs: randomDelay(),
      actions: [
        { type: 'schedule_followup', delayHours: 24 },
      ],
    };
  }
  
  if (attempt === 2) {
    return {
      message: `Oi ${nome}!\n\nAinda tá interessado? Se mudou de ideia, sem problema!\n\nQualquer coisa é só chamar 👍`,
      shouldSendNow: true,
      delayMs: randomDelay(),
      actions: [
        { type: 'schedule_followup', delayHours: 48 },
      ],
    };
  }
  
  // Terceira e última tentativa
  return {
    message: `${nome}, vou deixar você livre agora!\n\nMas se voltar a se interessar, pode me chamar a qualquer momento. Tô sempre por aqui! 😊`,
    shouldSendNow: true,
    delayMs: randomDelay(),
    actions: [
      { type: 'freeze_lead' },
    ],
  };
}

function generateHandoffMessage(nome: string, reason: string): BotResponse {
  const messages: Record<string, string> = {
    pediu_falar_humano: `Claro, ${nome}! Vou te conectar com um dos nossos especialistas agora. Um momento! 😊`,
    lead_muito_quente: `${nome}, você tem um perfil super interessante! 🎯\n\nVou te conectar com nosso especialista que vai te passar todos os detalhes. Tudo bem?`,
    interesse_alto_multiplos_sinais: `Ótimo, ${nome}! Vou te conectar com um especialista que vai te ajudar com todas essas informações! 😊`,
    warm_por_2_dias: `${nome}, pela sua busca, vejo que você tá bem decidido!\n\nVou te conectar com um especialista que pode te ajudar melhor. Pode ser?`,
    entrada_alta_disponivel: `Perfeito, ${nome}! Com esse valor conseguimos ótimas condições 🎯\n\nVou te passar pro especialista que vai montar a melhor proposta pra você!`,
  };
  
  return {
    message: messages[reason] || messages.lead_muito_quente,
    shouldSendNow: true,
    delayMs: randomDelay(),
    shouldHandoff: true,
    handoffReason: reason,
    actions: [
      { type: 'alert_corretor', priority: 'urgent' },
    ],
  };
}

function generateDefaultResponse(nome: string): BotResponse {
  return {
    message: `Desculpa, ${nome}, não entendi bem. Pode reformular?`,
    shouldSendNow: true,
    delayMs: randomDelay(),
  };
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Gera delay aleatório para simular digitação humana
 */
function randomDelay(): number {
  return Math.floor(
    Math.random() * (MESSAGE_DELAYS.MAX - MESSAGE_DELAYS.MIN) + MESSAGE_DELAYS.MIN
  );
}

/**
 * Verifica se está dentro do horário de operação
 */
export function isWithinOperatingHours(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Domingo, 6 = Sábado
  const hour = now.getHours();
  
  // Domingo
  if (day === 0) {
    return false; // Apenas responde a mensagens recebidas, não inicia
  }
  
  // Sábado
  if (day === 6) {
    return hour >= 9 && hour < 18;
  }
  
  // Segunda a Sexta
  return hour >= 8 && hour < 20;
}

/**
 * Gera mensagem fora do horário
 */
export function getOutOfHoursMessage(nome: string): string {
  return `Oi ${nome}! 😊\n\nRecebi sua mensagem mas já passei do horário.\nVou te responder amanhã de manhã, tá?\n\nSe for urgente, pode ligar: (11) 3333-4444`;
}

/**
 * Atualiza o estado da conversa com nova mensagem
 */
export function updateConversationState(
  state: ConversationState,
  userMessage: string,
  botResponse: BotResponse
): ConversationState {
  const contextUpdates = extractContext(userMessage);
  
  // Incrementar contador de perguntas se detectou sinais quentes
  if (detectHotSignals(userMessage)) {
    contextUpdates.perguntas_feitas = (state.context.perguntas_feitas || 0) + 1;
  }
  
  // Resetar contador de mensagens sem resposta
  contextUpdates.mensagens_sem_resposta = 0;
  contextUpdates.ultima_resposta = new Date();
  
  const updatedContext = {
    ...state.context,
    ...contextUpdates,
  };
  
  const newScore = calculateLeadScore(updatedContext);
  
  return {
    ...state,
    stage: botResponse.nextStage || state.stage,
    temperature: newScore.temperature,
    score: newScore,
    context: updatedContext,
    messageCount: state.messageCount + 1,
    updatedAt: new Date(),
    shouldHandoff: botResponse.shouldHandoff || false,
    handoffReason: botResponse.handoffReason,
  };
}

// ============================================
// EXPORTAÇÕES
// ============================================

export const WhatsAppBot = {
  calculateLeadScore,
  detectHotSignals,
  detectColdSignals,
  detectHumanRequest,
  extractContext,
  shouldHandoffToCorretor,
  generateBotResponse,
  isWithinOperatingHours,
  getOutOfHoursMessage,
  updateConversationState,
};
