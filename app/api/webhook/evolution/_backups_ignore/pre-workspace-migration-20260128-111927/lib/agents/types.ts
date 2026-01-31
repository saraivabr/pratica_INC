/**
 * Tipos para configuração de Agentes IA
 */

export type AgentPersonality = 'amigavel' | 'profissional' | 'direto';

export interface AgentTraits {
  openness: number;        // Abertura - Curiosidade e criatividade (0-100)
  conscientiousness: number; // Organização - Segue processos (0-100)
  extraversion: number;    // Extroversão - Sociabilidade (0-100)
  agreeableness: number;   // Amabilidade - Empatia (0-100)
  neuroticism: number;     // Neuroticismo - Nível de stress (0-100, menor = mais calmo)
}

export interface AgentBusinessHours {
  enabled: boolean;
  start: string;  // HH:MM
  end: string;    // HH:MM
  days: number[]; // 0=Dom, 1=Seg, ..., 6=Sáb
}

export interface AgentConfig {
  id: string;
  tenantId: number;
  instanceName: string;
  isActive: boolean;

  // Personalidade
  agentName: string;
  agentRole: string;
  personality: AgentPersonality;
  traits: AgentTraits;

  // Mensagens
  greetingMessage: string;
  fallbackMessage: string;
  escalationMessage: string;
  outOfHoursMessage: string;

  // Comportamento
  autoReply: boolean;
  typingDelayMs: number;
  maxMessageLength: number;

  // Horário de funcionamento
  businessHours: AgentBusinessHours;

  // Escalação
  escalationKeywords: string[];
  escalationFrustrationThreshold: number;

  // Features
  usePsychologicalAnalysis: boolean;
  useProactiveMessages: boolean;

  // Metadata
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface AgentConfigInput {
  instanceName: string;
  isActive?: boolean;
  agentName?: string;
  agentRole?: string;
  personality?: AgentPersonality;
  traits?: Partial<AgentTraits>;
  greetingMessage?: string;
  fallbackMessage?: string;
  escalationMessage?: string;
  outOfHoursMessage?: string;
  autoReply?: boolean;
  typingDelayMs?: number;
  maxMessageLength?: number;
  businessHours?: Partial<AgentBusinessHours>;
  escalationKeywords?: string[];
  escalationFrustrationThreshold?: number;
  usePsychologicalAnalysis?: boolean;
  useProactiveMessages?: boolean;
}

export interface AgentTestRequest {
  message: string;
  agentConfig?: Partial<AgentConfig>;
}

export interface AgentTestResponse {
  success: boolean;
  response: string;
  analysis: {
    intentDetected: string;
    intentConfidence: number;
    sentiment: string;
    frustrationLevel: number;
    responseTimeMs: number;
  };
}

export interface ConversationLog {
  id: string;
  tenantId: number;
  agentConfigId?: string;
  instanceName: string;
  phoneNumber: string;
  leadId?: number;
  sessionId?: string;
  messageReceived: string;
  messageType: string;
  intentDetected?: string;
  intentConfidence?: number;
  sentiment?: string;
  frustrationLevel?: number;
  responseGenerated?: string;
  responseSent: boolean;
  responseTimeMs?: number;
  wasEscalated: boolean;
  escalationReason?: string;
  createdAt: string;
}

// Default values
export const DEFAULT_AGENT_CONFIG: Omit<AgentConfig, 'id' | 'tenantId' | 'instanceName' | 'createdAt' | 'updatedAt'> = {
  isActive: false,
  agentName: 'Sofia',
  agentRole: 'Assistente de vendas e suporte',
  personality: 'amigavel',
  traits: {
    openness: 80,
    conscientiousness: 90,
    extraversion: 70,
    agreeableness: 90,
    neuroticism: 20,
  },
  greetingMessage: 'Olá! Sou a Sofia, assistente virtual da Pratica Incorporadora. Como posso ajudá-lo hoje?',
  fallbackMessage: 'Desculpe, não entendi bem. Pode reformular sua pergunta?',
  escalationMessage: 'Vou transferir você para um atendente humano que poderá ajudá-lo melhor.',
  outOfHoursMessage: 'Nosso atendimento funciona de segunda a sexta, das 8h às 18h. Deixe sua mensagem!',
  autoReply: true,
  typingDelayMs: 1500,
  maxMessageLength: 500,
  businessHours: {
    enabled: false,
    start: '08:00',
    end: '18:00',
    days: [1, 2, 3, 4, 5], // Seg a Sex
  },
  escalationKeywords: ['gerente', 'humano', 'atendente', 'reclamação', 'problema grave'],
  escalationFrustrationThreshold: 7,
  usePsychologicalAnalysis: false,
  useProactiveMessages: false,
  metadata: {},
};
