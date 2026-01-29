/**
 * Input Validation - Enterprise Security
 * Protege contra injection, XSS, path traversal, etc.
 */

import { z } from 'zod'

/**
 * Validação de CPF
 */
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleaned = cpf.replace(/\D/g, '')
  
  if (cleaned.length !== 11) return false
  
  // Rejeita CPFs conhecidos como inválidos
  if (/^(\d)\1{10}$/.test(cleaned)) return false
  
  // Validação do primeiro dígito
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned.charAt(9))) return false
  
  // Validação do segundo dígito
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cleaned.charAt(10))) return false
  
  return true
}

/**
 * Validação de telefone brasileiro
 */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  // Aceita: 11 dígitos (celular com DDD) ou 10 dígitos (fixo com DDD)
  return /^[1-9]{2}9?\d{8}$/.test(cleaned)
}

/**
 * Validação de email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Sanitização de string - remove caracteres perigosos
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>'"]/g, '') // Remove HTML/SQL perigosos
    .replace(/\\/g, '') // Remove backslashes
    .trim()
}

/**
 * Sanitização de SQL - previne injection
 * NOTA: Use sempre prepared statements! Isso é apenas camada extra.
 */
export function sanitizeSQL(input: string): string {
  return input
    .replace(/['";\\]/g, '') // Remove aspas e ponto-e-vírgula
    .replace(/--/g, '')      // Remove comentários SQL
    .replace(/\/\*/g, '')    // Remove /* comentários */
    .trim()
}

/**
 * Validação de path - previne path traversal
 */
export function validatePath(path: string): boolean {
  // Rejeita path traversal attempts
  if (path.includes('..') || path.includes('//')) return false
  if (path.includes('\0')) return false // Null byte injection
  
  // Path deve começar com / e conter apenas caracteres seguros
  return /^\/[a-zA-Z0-9\/_-]*$/.test(path)
}

/**
 * Validação de workspace_id (multi-tenant)
 */
export function validateWorkspaceId(id: unknown): boolean {
  const num = Number(id)
  return Number.isInteger(num) && num > 0
}

/**
 * Validação de UUID v4
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Schemas Zod comuns - validações reutilizáveis
 */
export const schemas = {
  // Autenticação
  phone: z.string()
    .min(10, 'Telefone deve ter no mínimo 10 dígitos')
    .max(15, 'Telefone deve ter no máximo 15 dígitos')
    .regex(/^\+?[0-9]{10,15}$/, 'Formato de telefone inválido'),
  
  otp: z.string()
    .length(6, 'OTP deve ter 6 dígitos')
    .regex(/^\d{6}$/, 'OTP deve conter apenas números'),
  
  cpf: z.string()
    .min(11, 'CPF inválido')
    .max(14, 'CPF inválido')
    .refine(validateCPF, 'CPF inválido'),
  
  email: z.string()
    .email('Email inválido')
    .max(254, 'Email muito longo')
    .refine(validateEmail, 'Formato de email inválido'),
  
  // Multi-tenant
  workspaceId: z.number()
    .int('Workspace ID deve ser inteiro')
    .positive('Workspace ID deve ser positivo'),
  
  // IDs
  id: z.number()
    .int('ID deve ser inteiro')
    .positive('ID deve ser positivo'),
  
  uuid: z.string()
    .uuid('UUID inválido')
    .refine(validateUUID, 'Formato UUID inválido'),
  
  // Strings seguras
  safeName: z.string()
    .min(1, 'Nome obrigatório')
    .max(100, 'Nome muito longo')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome contém caracteres inválidos'),
  
  safeText: z.string()
    .min(1, 'Texto obrigatório')
    .max(1000, 'Texto muito longo')
    .transform(sanitizeString),
  
  // URLs
  url: z.string()
    .url('URL inválida')
    .max(2048, 'URL muito longa'),
  
  // Webhook secrets
  webhookSecret: z.string()
    .min(32, 'Secret deve ter no mínimo 32 caracteres')
    .max(128, 'Secret muito longo'),
  
  // Tokens
  token: z.string()
    .min(20, 'Token inválido')
    .max(500, 'Token muito longo')
    .regex(/^[A-Za-z0-9_-]+$/, 'Token contém caracteres inválidos'),
}

/**
 * Validação de request body genérica
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)
    
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: errors }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    return { success: false, error: 'Invalid JSON body' }
  }
}

/**
 * Validação de headers críticos
 */
export function validateHeaders(headers: Headers): {
  contentType?: string
  authorization?: string
  workspaceId?: number
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const result: any = { isValid: true, errors }
  
  // Content-Type para POST/PUT
  const contentType = headers.get('content-type')
  if (contentType) {
    result.contentType = contentType
    if (!contentType.includes('application/json')) {
      errors.push('Content-Type must be application/json')
      result.isValid = false
    }
  }
  
  // Authorization header
  const auth = headers.get('authorization')
  if (auth) {
    result.authorization = auth
    if (!auth.startsWith('Bearer ')) {
      errors.push('Authorization must be Bearer token')
      result.isValid = false
    }
  }
  
  // Workspace ID (multi-tenant)
  const wsId = headers.get('x-workspace-id')
  if (wsId) {
    const num = Number(wsId)
    if (!Number.isInteger(num) || num <= 0) {
      errors.push('Invalid X-Workspace-ID')
      result.isValid = false
    } else {
      result.workspaceId = num
    }
  }
  
  return result
}

/**
 * Exemplo de uso:
 * 
 * const validation = await validateRequestBody(request, z.object({
 *   phone: schemas.phone,
 *   name: schemas.safeName,
 * }))
 * 
 * if (!validation.success) {
 *   return NextResponse.json({ error: validation.error }, { status: 400 })
 * }
 * 
 * const { phone, name } = validation.data
 */
