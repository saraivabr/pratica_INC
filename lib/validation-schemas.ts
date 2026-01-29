/**
 * Zod Validation Schemas
 * Centralized validation for API endpoints
 * 
 * Provides type-safe input validation with clear error messages
 */

import { z } from 'zod';

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
// API Request Schemas
// ============================================

/**
 * POST /api/auth/send-otp
 */
export const SendOTPSchema = z.object({
  telefone: phoneSchema,
});

export type SendOTPRequest = z.infer<typeof SendOTPSchema>;

/**
 * POST /api/auth/verify-otp
 */
export const VerifyOTPSchema = z.object({
  telefone: phoneSchema,
  code: otpCodeSchema,
  sessionId: uuidSchema.optional(),
});

export type VerifyOTPRequest = z.infer<typeof VerifyOTPSchema>;

/**
 * POST /api/auth/login
 */
export const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

/**
 * POST /api/auth/register
 */
export const RegisterSchema = z.object({
  nome: nameSchema,
  email: emailSchema,
  password: z
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa'),
  telefone: phoneSchema.optional(),
  role: z.enum(['corretor', 'gerente', 'admin']).default('corretor'),
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

/**
 * POST /api/auth/set-password
 */
export const SetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, 'Senha deve ter no mínimo 6 caracteres')
    .max(100, 'Senha muito longa'),
});

export type SetPasswordRequest = z.infer<typeof SetPasswordSchema>;

/**
 * POST /api/whatsapp/send
 */
export const SendWhatsAppMessageSchema = z.object({
  instanceId: uuidSchema,
  to: phoneSchema,
  message: messageTextSchema,
  mediaUrl: urlSchema.optional(),
  quotedMessageId: z.string().optional(),
});

export type SendWhatsAppMessageRequest = z.infer<typeof SendWhatsAppMessageSchema>;

/**
 * POST /api/leads/create
 */
export const CreateLeadSchema = z.object({
  nome: nameSchema,
  telefone: phoneSchema,
  email: emailSchema.optional(),
  origem: z.enum(['whatsapp', 'site', 'facebook', 'instagram', 'indicacao', 'outro']),
  empreendimento_id: uuidSchema.optional(),
  observacoes: z.string().max(1000).optional(),
});

export type CreateLeadRequest = z.infer<typeof CreateLeadSchema>;

/**
 * PATCH /api/leads/:id
 */
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

/**
 * POST /api/users/create
 */
export const CreateUserSchema = z.object({
  nome: nameSchema,
  telefone: phoneSchema,
  email: emailSchema.optional(),
  role: z.enum(['admin', 'gerente', 'corretor']),
  gerente_id: uuidSchema.optional(),
});

export type CreateUserRequest = z.infer<typeof CreateUserSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Parse and validate request body with Zod schema
 * Returns { success: true, data } or { success: false, error }
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<
  | { success: true; data: T }
  | { success: false; error: string; details?: z.ZodError }
> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors nicely
      const firstError = error.errors[0];
      const field = firstError.path.join('.');
      const message = firstError.message;

      return {
        success: false,
        error: field ? `${field}: ${message}` : message,
        details: error,
      };
    }

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'JSON inválido',
      };
    }

    return {
      success: false,
      error: 'Erro ao validar requisição',
    };
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
