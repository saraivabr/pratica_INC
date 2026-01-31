/**
 * Zod Validation Schemas
 * Centralized validation for API endpoints
 *
 * Provides type-safe input validation with clear error messages
 */

import { z } from 'zod';

// ============================================
// Base Field Schemas
// ============================================

/**
 * Phone number validation
 * Accepts formats: (11) 99999-9999 or (11) 9999-9999
 * Normalizes to: 11999999999 (digits only)
 */
export const phoneSchema = z
  .string()
  .regex(
    /^\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})$/,
    'Formato de telefone inválido. Use: (11) 99999-9999'
  )
  .transform((val) => val.replace(/\D/g, '')); // Remove non-digits

/**
 * OTP code validation
 * Exactly 6 digits
 */
export const otpCodeSchema = z
  .string()
  .length(6, 'Código deve ter exatamente 6 dígitos')
  .regex(/^\d{6}$/, 'Código deve conter apenas números');

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Email inválido')
  .max(255, 'Email muito longo');

/**
 * Name validation
 */
export const nameSchema = z
  .string()
  .min(2, 'Nome deve ter pelo menos 2 caracteres')
  .max(100, 'Nome muito longo')
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras');

/**
 * UUID validation
 */
export const uuidSchema = z
  .string()
  .uuid('ID inválido');

/**
 * Message text validation
 * For WhatsApp messages
 */
export const messageTextSchema = z
  .string()
  .min(1, 'Mensagem não pode ser vazia')
  .max(4096, 'Mensagem muito longa (máximo 4096 caracteres)');

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url('URL inválida')
  .max(2048, 'URL muito longa');

// ============================================
// Helper Functions
// ============================================

/**
 * Validate request body against a Zod schema
 */
export async function validateRequest<I, O>(
  request: Request,
  schema: z.ZodType<O, any, I>
): Promise<{ success: true; data: O } | { success: false; error: string; details?: any }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] || 'Dados inválidos';
      return { success: false, error: firstError as string, details: fieldErrors };
    }
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: 'Corpo da requisição inválido ou ausente' };
  }
}

/**
 * Normalize phone number to digits only
 * Example: (11) 99999-9999 -> 11999999999
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Format phone number for display
 * Example: 11999999999 -> (11) 99999-9999
 */
export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone);

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone; // Return as-is if invalid format
}

// ==========================================
// Auth Schemas
// ==========================================

/** POST /api/auth/send-otp */
export const SendOTPSchema = z.object({
  telefone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').max(20),
});

export type SendOTPRequest = z.infer<typeof SendOTPSchema>;

/** POST /api/auth/verify-otp */
export const VerifyOTPSchema = z.object({
  sessionId: z.string().uuid('Session ID inválido'),
  code: z.string().length(6, 'Código deve ter 6 dígitos'),
  telefone: z.string().optional(),
});

export type VerifyOTPRequest = z.infer<typeof VerifyOTPSchema>;

/** POST /api/auth/register */
export const RegisterSchema = z.object({
  telefone: z.string().min(10).max(20),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(200),
  imobiliaria: z.string().optional(),
  gerente: z.string().optional(),
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

/** POST /api/auth/validate-session */
export const ValidateSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID é obrigatório'),
});

export type ValidateSessionRequest = z.infer<typeof ValidateSessionSchema>;

// ==========================================
// User Schemas
// ==========================================

/** PATCH /api/users/:id */
export const UserUpdateSchema = z.object({
  userId: z.string().uuid('User ID inválido'),
  nome: z.string().min(2).max(200),
});

export type UserUpdateRequest = z.infer<typeof UserUpdateSchema>;

/** POST /api/users/create */
export const CreateUserSchema = z.object({
  nome: nameSchema,
  telefone: phoneSchema,
  email: emailSchema.optional(),
  role: z.enum(['admin', 'gerente', 'corretor']),
  gerente_id: uuidSchema.optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

// ==========================================
// Simulation Schemas
// ==========================================

/** POST /api/simular */
export const SimularSchema = z.object({
  valorImovel: z.number().positive('Valor do imóvel deve ser positivo'),
  percentualEntrada: z.number().min(0).max(100).default(20),
  valorEntrada: z.number().min(0).optional(),
  prazoMeses: z.number().int().min(1).max(420),
  taxaAnual: z.number().min(0).max(100).default(10),
  sistema: z.enum(['sac', 'price']).optional(),
});

export type SimularRequest = z.infer<typeof SimularSchema>;

/** POST /api/simular/caixa */
export const SimularCaixaSchema = z.object({
  valorImovel: z.number().positive(),
  valorEntrada: z.number().min(0),
  prazoMeses: z.number().int().min(1).max(420),
  usarMCMV: z.boolean().optional(),
  valorFGTS: z.number().min(0).optional(),
  cidade: z.enum(['sp', 'rj', 'outros']).optional(),
});

export type SimularCaixaRequest = z.infer<typeof SimularCaixaSchema>;

// ==========================================
// CRM Schemas
// ==========================================

/** POST /api/crm/pipeline/move */
export const PipelineMoveSchema = z.object({
  leadId: z.union([z.number().int().positive(), z.string().min(1)]),
  stageId: z.union([z.number().int().positive(), z.string().min(1)]),
});

export type PipelineMoveRequest = z.infer<typeof PipelineMoveSchema>;

/** POST /api/crm/campaigns */
export const CampaignCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  message_template: z.string().min(1).max(2000),
  segmentation_config: z.record(z.unknown()).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
});

export type CampaignCreateRequest = z.infer<typeof CampaignCreateSchema>;

/** POST /api/crm/automations */
export const AutomationCreateSchema = z.object({
  name: z.string().min(1).max(200),
  trigger_type: z.string().min(1),
  trigger_config: z.record(z.unknown()).optional(),
  action_type: z.string().min(1),
  action_config: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export type AutomationCreateRequest = z.infer<typeof AutomationCreateSchema>;

/** PUT /api/crm/automations/:id */
export const AutomationUpdateSchema = z.object({
  id: z.union([z.number().int().positive(), z.string().min(1)]),
  name: z.string().min(1).max(200).optional(),
  trigger_type: z.string().optional(),
  trigger_config: z.record(z.unknown()).optional(),
  action_type: z.string().optional(),
  action_config: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

export type AutomationUpdateRequest = z.infer<typeof AutomationUpdateSchema>;

// ==========================================
// Lead Schemas
// ==========================================

/** POST /api/leads/create */
export const CreateLeadSchema = z.object({
  nome: nameSchema,
  telefone: phoneSchema,
  email: emailSchema.optional(),
  origem: z.enum(['whatsapp', 'site', 'facebook', 'instagram', 'indicacao', 'outro']),
  empreendimento_id: uuidSchema.optional(),
  observacoes: z.string().max(1000).optional(),
});

export type CreateLeadRequest = z.infer<typeof CreateLeadSchema>;

/** PATCH /api/leads/:id */
export const UpdateLeadSchema = z.object({
  nome: nameSchema.optional(),
  telefone: phoneSchema.optional(),
  email: emailSchema.optional(),
  status: z.enum([
    'novo',
    'qualificado',
    'agendamento',
    'proposta',
    'negociacao',
    'ganho',
    'perdido',
  ]).optional(),
  score: z.number().min(0).max(100).optional(),
  observacoes: z.string().max(1000).optional(),
});

export type UpdateLeadRequest = z.infer<typeof UpdateLeadSchema>;

/** PATCH /api/leads/:id/stage */
export const LeadStageSchema = z.object({
  stage: z.string().min(1, 'Stage é obrigatório'),
});

export type LeadStageRequest = z.infer<typeof LeadStageSchema>;

/** PATCH /api/leads/:id/cpf */
export const LeadCpfSchema = z.object({
  cpf: z.string().min(1, 'CPF não informado'),
});

export type LeadCpfRequest = z.infer<typeof LeadCpfSchema>;

// ==========================================
// PDF Schemas
// ==========================================

/** POST /api/pdf/simulacao */
export const PdfSimulacaoSchema = z.object({
  userId: z.string().min(1),
  empreendimentoNome: z.string().min(1),
  unidade: z.record(z.any()).optional(),
  simulacao: z.record(z.any()),
});

export type PdfSimulacaoRequest = z.infer<typeof PdfSimulacaoSchema>;

/** POST /api/pdf/book */
export const PdfBookSchema = z.object({
  empreendimentoId: z.union([z.number().int().positive(), z.string().min(1)]),
  userId: z.string().min(1),
});

export type PdfBookRequest = z.infer<typeof PdfBookSchema>;

/** POST /api/pdf/tabela */
export const PdfTabelaSchema = z.object({
  empreendimentoId: z.union([z.number().int().positive(), z.string().min(1)]),
  userId: z.string().min(1),
});

export type PdfTabelaRequest = z.infer<typeof PdfTabelaSchema>;

// ==========================================
// WhatsApp Schemas
// ==========================================

/** POST /api/whatsapp/send */
export const SendWhatsAppMessageSchema = z.object({
  instanceId: uuidSchema,
  to: phoneSchema,
  message: messageTextSchema,
  mediaUrl: urlSchema.optional(),
  quotedMessageId: z.string().optional(),
});

export type SendWhatsAppMessageRequest = z.infer<typeof SendWhatsAppMessageSchema>;

/** POST /api/whatsapp/typing */
export const WhatsAppTypingSchema = z.object({
  instanceName: z.string().min(1, 'instanceName é obrigatório'),
  phoneNumber: z.string().min(1, 'phoneNumber é obrigatório'),
  action: z.enum(['start', 'stop']).default('start'),
  duration: z.number().int().positive().default(3000),
});

export type WhatsAppTypingRequest = z.infer<typeof WhatsAppTypingSchema>;

/** POST /api/whatsapp/send-material */
export const WhatsAppSendMaterialSchema = z.object({
  userId: z.string().min(1, 'userId é obrigatório'),
  type: z.enum(['tabela', 'simulacao', 'book'], { errorMap: () => ({ message: 'Tipo deve ser tabela, simulacao ou book' }) }),
  empreendimento: z.object({
    id: z.string().min(1),
    nome: z.string().min(1),
    cidade: z.string().optional(),
    bairro: z.string().optional(),
    construtora: z.string().optional(),
    previsaoEntrega: z.string().optional(),
    tipo: z.string().optional(),
    descricao: z.string().optional(),
    diferenciais: z.array(z.string()).optional(),
    imagemPrincipal: z.string().optional(),
    precoMinimo: z.number().optional(),
    precoMaximo: z.number().optional(),
  }),
  unidades: z.array(z.object({
    id: z.string(),
    tipo: z.string(),
    metragem: z.number(),
    valor: z.number(),
    status: z.string(),
    quartos: z.number(),
    vagas: z.number(),
    andar: z.number().optional(),
    final: z.string().optional(),
  })).default([]),
  simulacao: z.object({
    valorImovel: z.number().positive(),
    entrada: z.number().min(0),
    percentualEntrada: z.number().min(0).max(100),
    valorFinanciado: z.number().min(0),
    prazoMeses: z.number().int().positive(),
    taxaAnual: z.number().min(0),
    parcelaMensal: z.number().min(0),
    totalPago: z.number().min(0),
    totalJuros: z.number().min(0),
  }).optional(),
  unidade: z.object({
    numero: z.string(),
    tipo: z.string(),
  }).optional(),
});

export type WhatsAppSendMaterialRequest = z.infer<typeof WhatsAppSendMaterialSchema>;

/** POST /api/whatsapp/session/start */
export const WhatsAppSessionStartSchema = z.object({
  freshConnection: z.boolean().default(false),
});

export type WhatsAppSessionStartRequest = z.infer<typeof WhatsAppSessionStartSchema>;

// ==========================================
// Chat Schema
// ==========================================

/** POST /api/chat */
export const ChatSchema = z.object({
  text: z.string().min(1, 'Mensagem é obrigatória').max(5000),
});

export type ChatRequest = z.infer<typeof ChatSchema>;

// ==========================================
// AI Schemas
// ==========================================

/** POST /api/ai/junction-insights */
export const JunctionInsightsSchema = z.object({
  config: z.record(z.any()),
  units: z.array(z.any()),
  flow: z.array(z.any()),
  totals: z.record(z.any()),
});

export type JunctionInsightsRequest = z.infer<typeof JunctionInsightsSchema>;

// ==========================================
// CPF Score Schema
// ==========================================

/** POST /api/cpf-score */
export const CpfScoreSchema = z.object({
  cpf: z.string().min(11).max(14),
});

export type CpfScoreRequest = z.infer<typeof CpfScoreSchema>;

// ==========================================
// Notification Schema
// ==========================================

/** POST /api/notificacoes */
export const NotificacaoCreateSchema = z.object({
  corretor_id: z.union([z.number().int().positive(), z.string().min(1)]),
  lead_id: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  tipo: z.string().min(1),
  mensagem: z.string().min(1).max(1000),
  link_acao: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type NotificacaoCreateRequest = z.infer<typeof NotificacaoCreateSchema>;

// ==========================================
// Interacao Schema
// ==========================================

/** POST /api/interacoes */
export const InteracaoCreateSchema = z.object({
  empreendimento_id: z.coerce.string(),
  empreendimento_nome: z.string().optional(),
  tipo_material: z.string().min(1, 'tipo_material é obrigatório'),
  lead_nome: z.string().optional(),
  lead_telefone: z.string().optional(),
  lead_id: z.coerce.string().optional(),
  unidade_id: z.coerce.string().optional(),
  simulacao_data: z.any().optional(),
  notas_internas: z.string().max(2000).optional(),
  mensagem_enviada: z.string().max(2000).optional(),
});

export type InteracaoCreateRequest = z.infer<typeof InteracaoCreateSchema>;

// ==========================================
// Acao Schemas
// ==========================================

/** POST /api/acoes/simulacao */
export const AcaoSimulacaoSchema = z.object({
  lead_id: z.union([z.number(), z.string()]),
  corretor_id: z.union([z.number(), z.string()]).default('default-user'),
  valor_imovel: z.number().positive('valor_imovel deve ser positivo'),
  entrada: z.number().min(0).optional(),
  entrada_percentual: z.number().min(0).max(100).optional(),
  taxa_juros: z.number().positive('taxa_juros deve ser positivo'),
  prazo_meses: z.number().int().positive('prazo_meses deve ser positivo'),
  imovel_id: z.union([z.number(), z.string()]).optional(),
  imovel_nome: z.string().optional(),
  enviar_whatsapp: z.boolean().default(true),
});

export type AcaoSimulacaoRequest = z.infer<typeof AcaoSimulacaoSchema>;

// ==========================================
// Admin Schemas
// ==========================================

/** POST /api/admin/users */
export const AdminUserCreateSchema = z.object({
  nome: z.string().min(2).max(200),
  telefone: z.string().min(10).max(20),
  role: z.enum(['corretor', 'gerente', 'admin']).optional(),
  imobiliaria_id: z.union([z.number(), z.string()]).optional().nullable(),
  gerente_id: z.union([z.number(), z.string()]).optional().nullable(),
});

export type AdminUserCreateRequest = z.infer<typeof AdminUserCreateSchema>;

/** POST /api/admin/imobiliarias */
export const AdminImobiliariaSchema = z.object({
  nome: z.string().min(2).max(200),
  cnpj: z.string().max(20).optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  endereco: z.string().max(500).optional().nullable(),
});

export type AdminImobiliariaRequest = z.infer<typeof AdminImobiliariaSchema>;

/** POST /api/admin/sync */
export const AdminSyncSchema = z.object({
  type: z.enum(['imobiliarias', 'corretores']),
});

export type AdminSyncRequest = z.infer<typeof AdminSyncSchema>;

// ==========================================
// Tracking Schema
// ==========================================

/** POST /api/analytics/track */
export const TrackEventSchema = z.object({
  userId: z.string().optional(),
  eventType: z.string().min(1).max(100).optional(),
  page: z.string().max(500).optional(),
  data: z.record(z.unknown()).optional(),
  // For analytics/track
  name: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
  url: z.string().max(2000).optional(),
  userAgent: z.string().max(500).optional(),
});

export type TrackEventRequest = z.infer<typeof TrackEventSchema>;

// ==========================================
// Permissoes Schema
// ==========================================

/** PUT /api/admin/permissoes */
export const PermissaoUpdateSchema = z.object({
  userId: z.string().min(1),
  permissions: z.record(z.boolean()),
});

export type PermissaoUpdateRequest = z.infer<typeof PermissaoUpdateSchema>;

// ==========================================
// Intermediacao Schemas
// ==========================================

/** POST /api/intermediacao/beneficiarios */
export const BeneficiarioCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo_documento: z.enum(['cpf', 'cnpj'], { errorMap: () => ({ message: "Tipo de documento deve ser 'cpf' ou 'cnpj'" }) }),
  documento: z.string().min(1, 'Documento é obrigatório'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipo_conta: z.string().optional(),
  pix: z.string().optional(),
  observacoes: z.string().optional(),
});

export type BeneficiarioCreateRequest = z.infer<typeof BeneficiarioCreateSchema>;

/** POST /api/intermediacao/pagamentos */
export const PagamentoCreateSchema = z.object({
  beneficiario_id: z.union([z.number(), z.string()]),
  parcela_id: z.union([z.number(), z.string()]).optional(),
  valor: z.number().positive(),
  data_pagamento: z.string().optional(),
  comprovante_url: z.string().optional(),
  observacoes: z.string().max(1000).optional(),
});

export type PagamentoCreateRequest = z.infer<typeof PagamentoCreateSchema>;

/** POST /api/intermediacao/pagamentos/lote */
export const PagamentoLoteSchema = z.object({
  parcela_ids: z.array(z.union([z.string(), z.number()])).min(1, 'Lista de parcelas é obrigatória').max(100, 'Máximo de 100 parcelas por lote'),
  data_pagamento: z.string().min(1, 'Data de pagamento é obrigatória'),
  metodo: z.enum(['transferencia', 'deposito', 'pix', 'cheque', 'outro'], {
    errorMap: () => ({ message: 'Método inválido. Valores aceitos: transferencia, deposito, pix, cheque, outro' }),
  }),
  referencia: z.string().optional(),
});

export type PagamentoLoteRequest = z.infer<typeof PagamentoLoteSchema>;

/** POST /api/intermediacao/vendas/:id/distribuicao */
export const VendaDistribuicaoSchema = z.object({
  distribuicoes: z.array(z.object({
    beneficiario_id: z.string().uuid(),
    percentual: z.number().min(0).max(100),
  })).min(1),
});

export type VendaDistribuicaoRequest = z.infer<typeof VendaDistribuicaoSchema>;

/** POST /api/intermediacao/vendas/:id/parcelar */
export const VendaParcelarSchema = z.object({
  tipo: z.enum(['automatico', 'manual']),
  num_parcelas: z.number().int().min(1).max(120).optional(),
  data_primeira_parcela: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  parcelas: z.array(z.object({
    beneficiario_id: z.string().uuid(),
    valor: z.number().positive(),
    data_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })).optional(),
});

export type VendaParcelarRequest = z.infer<typeof VendaParcelarSchema>;

/** PATCH /api/intermediacao/vendas/:id/status */
export const VendaStatusSchema = z.object({
  status: z.enum(['rascunho', 'em_processamento', 'concluida', 'paga', 'cancelada']),
  motivo: z.string().optional(),
});

export type VendaStatusRequest = z.infer<typeof VendaStatusSchema>;
