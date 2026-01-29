/**
 * Rate Limiter - Production Enterprise Grade
 * Protege APIs críticas contra abuso e DDoS
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
  skipSuccessfulRequests?: boolean
  keyGenerator?: (req: NextRequest) => string
}

interface RateLimitStore {
  count: number
  resetTime: number
}

// In-memory store (use Redis em produção enterprise se necessário)
const store = new Map<string, RateLimitStore>()

/**
 * Gerar chave única por IP + rota
 */
function defaultKeyGenerator(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown'
  const pathname = new URL(req.url).pathname
  return `${ip}:${pathname}`
}

/**
 * Cleanup - remove entradas expiradas a cada 5 minutos
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of store.entries()) {
    if (data.resetTime < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000) // 5 minutos

/**
 * Rate Limiter Middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator = defaultKeyGenerator,
  } = config

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const key = keyGenerator(req)
    const now = Date.now()
    
    let record = store.get(key)
    
    // Criar novo registro ou resetar se expirado
    if (!record || record.resetTime < now) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      }
      store.set(key, record)
    }
    
    // Incrementar contador
    record.count++
    
    // Calcular headers de rate limit
    const remaining = Math.max(0, maxRequests - record.count)
    const resetTime = Math.ceil(record.resetTime / 1000) // Unix timestamp em segundos
    
    // Headers padrão rate limit (RFC 6585)
    const headers = {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString(),
      'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString(),
    }
    
    // Se excedeu o limite
    if (record.count > maxRequests) {
      console.warn(`[RateLimit] Blocked: ${key} (${record.count}/${maxRequests})`)
      
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          message,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        {
          status: 429,
          headers,
        }
      )
    }
    
    // Request permitido - adicionar headers informativos
    return null // null = continuar processamento
  }
}

/**
 * Presets comuns de rate limiting
 */
export const rateLimitPresets = {
  // Login/Auth - muito restritivo
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 5, // 5 tentativas
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  
  // APIs de escrita/mutação
  mutation: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 30, // 30 requests/min
    message: 'Too many requests. Please slow down.',
  },
  
  // APIs de leitura
  read: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100, // 100 requests/min
  },
  
  // Webhooks externos
  webhook: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 50, // 50 webhooks/min por IP
    message: 'Webhook rate limit exceeded.',
  },
  
  // Uploads/heavy operations
  upload: {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 10, // 10 uploads/min
    message: 'Upload rate limit exceeded. Please wait before uploading again.',
  },
}

/**
 * Helper: aplicar rate limit em route handler
 */
export async function withRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const limiter = rateLimit(config)
  const limitResponse = await limiter(req)
  
  if (limitResponse) {
    return limitResponse // Rate limit exceeded
  }
  
  return handler() // Processa request normalmente
}
