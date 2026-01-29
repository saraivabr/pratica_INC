import { z } from 'zod';

/**
 * Schema para validação de Traços de Personalidade OCEAN
 */
export const AgentTraitsSchema = z.object({
  openness: z.number().min(0).max(100),
  conscientiousness: z.number().min(0).max(100),
  extraversion: z.number().min(0).max(100),
  agreeableness: z.number().min(0).max(100),
  neuroticism: z.number().min(0).max(100),
});

/**
 * Schema para validação de Horário de Funcionamento
 */
export const AgentBusinessHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
  days: z.array(z.number().min(0).max(6)),
});

/**
 * Schema para validação de Configuração de Agente (Input)
 */
export const AgentConfigInputSchema = z.object({
  instanceName: z.string().min(1, 'instanceName é obrigatório'),
  isActive: z.boolean().optional(),
  agentName: z.string().min(1).max(100).optional(),
  agentRole: z.string().min(1).max(200).optional(),
  personality: z.enum(['amigavel', 'profissional', 'direto']).optional(),
  traits: AgentTraitsSchema.partial().optional(),
  greetingMessage: z.string().max(500).optional(),
  fallbackMessage: z.string().max(500).optional(),
  escalationMessage: z.string().max(500).optional(),
  outOfHoursMessage: z.string().max(500).optional(),
  autoReply: z.boolean().optional(),
  typingDelayMs: z.number().min(0).max(10000).optional(),
  maxMessageLength: z.number().min(50).max(2000).optional(),
  businessHours: AgentBusinessHoursSchema.partial().optional(),
  escalationKeywords: z.array(z.string()).optional(),
  escalationFrustrationThreshold: z.number().min(1).max(10).optional(),
  usePsychologicalAnalysis: z.boolean().optional(),
  useProactiveMessages: z.boolean().optional(),
});

/**
 * Schema para validação de Request de criação/atualização de Agente
 */
export const AgentConfigRequestSchema = AgentConfigInputSchema.extend({
  workspaceId: z.number().int().positive().optional(),
  userId: z.string().optional(),
});

/**
 * Schema para validação de Request de Teste de Agente
 */
export const AgentTestRequestSchema = z.object({
  message: z.string().min(1, 'message é obrigatório'),
  workspaceId: z.number().int().positive().optional(),
  instanceName: z.string().optional(),
  agentConfig: AgentConfigInputSchema.partial().optional(),
});

// Tipos inferidos dos schemas
export type AgentTraitsInput = z.infer<typeof AgentTraitsSchema>;
export type AgentBusinessHoursInput = z.infer<typeof AgentBusinessHoursSchema>;
export type AgentConfigInputValidated = z.infer<typeof AgentConfigInputSchema>;
export type AgentConfigRequestValidated = z.infer<typeof AgentConfigRequestSchema>;
export type AgentTestRequestValidated = z.infer<typeof AgentTestRequestSchema>;
