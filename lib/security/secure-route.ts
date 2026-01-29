/**
 * Secure Route Wrapper - Unified Security Layer
 * Apply rate limiting + validation + auth in one line
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitPresets, type RateLimitConfig } from './rate-limiter'
import { validateHeaders } from './validation'

interface SecureRouteOptions {
  rateLimit?: RateLimitConfig
  requireAuth?: boolean
  requireWorkspace?: boolean
  customValidation?: (req: NextRequest) => Promise<NextResponse | null>
}

interface SessionData {
  userId?: string
  phone?: string
  role?: 'corretor' | 'gerente' | 'admin'
  workspaceId?: number
}

/**
 * Extract session from cookies (same logic as middleware.ts)
 */
function getSession(req: NextRequest): SessionData | null {
  const sessionCookie = req.cookies.get('pratica-session')
  
  if (sessionCookie?.value) {
    try {
      const decodedValue = decodeURIComponent(sessionCookie.value)
      const session = JSON.parse(decodedValue)
      if (session.userId && session.phone) {
        return {
          userId: session.userId,
          phone: session.phone,
          role: session.role || 'corretor',
          workspaceId: session.workspaceId,
        }
      }
    } catch {
      return null
    }
  }
  
  return null
}

/**
 * Secure Route Handler
 * Usage:
 * 
 * export const POST = secureRoute(
 *   async (req) => {
 *     // Your handler code
 *     return NextResponse.json({ success: true })
 *   },
 *   {
 *     rateLimit: rateLimitPresets.auth,
 *     requireAuth: true,
 *   }
 * )
 */
export function secureRoute(
  handler: (req: NextRequest, session: SessionData | null) => Promise<NextResponse>,
  options: SecureRouteOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Rate Limiting (se configurado)
      if (options.rateLimit) {
        const limiter = rateLimit(options.rateLimit)
        const limitResponse = await limiter(req)
        if (limitResponse) {
          return limitResponse
        }
      }
      
      // 2. Header Validation
      const headerValidation = validateHeaders(req.headers)
      if (!headerValidation.isValid) {
        return NextResponse.json(
          {
            error: 'invalid_headers',
            details: headerValidation.errors,
          },
          { status: 400 }
        )
      }
      
      // 3. Authentication Check
      const session = getSession(req)
      
      if (options.requireAuth && !session) {
        return NextResponse.json(
          { error: 'unauthorized', message: 'Authentication required' },
          { status: 401 }
        )
      }
      
      // 4. Workspace Validation (multi-tenant)
      if (options.requireWorkspace && (!session || !session.workspaceId)) {
        return NextResponse.json(
          { error: 'workspace_required', message: 'Workspace ID required' },
          { status: 403 }
        )
      }
      
      // 5. Custom Validation (se fornecida)
      if (options.customValidation) {
        const validationResponse = await options.customValidation(req)
        if (validationResponse) {
          return validationResponse
        }
      }
      
      // 6. Execute handler
      return await handler(req, session)
      
    } catch (error) {
      console.error('[secureRoute] Error:', error)
      
      // Não vazar detalhes de erro em produção
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'internal_server_error', message: 'An error occurred' },
          { status: 500 }
        )
      }
      
      // Em dev, mostrar erro completo
      return NextResponse.json(
        {
          error: 'internal_server_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Webhook Secure Route - valida secret + rate limit
 */
export function secureWebhook(
  handler: (req: NextRequest, payload: any) => Promise<NextResponse>,
  options: {
    secretHeader?: string // default: 'x-webhook-secret'
    secret?: string // se não fornecido, usa EVOLUTION_WEBHOOK_SECRET
    rateLimit?: RateLimitConfig
  } = {}
) {
  const {
    secretHeader = 'x-webhook-secret',
    secret = process.env.EVOLUTION_WEBHOOK_SECRET,
    rateLimit: rateLimitConfig = rateLimitPresets.webhook,
  } = options
  
  return secureRoute(
    async (req, _session) => {
      // Validar secret
      const providedSecret = req.headers.get(secretHeader)
      
      if (!secret) {
        console.error('[secureWebhook] EVOLUTION_WEBHOOK_SECRET not configured!')
        return NextResponse.json(
          { error: 'webhook_misconfigured' },
          { status: 500 }
        )
      }
      
      if (providedSecret !== secret) {
        console.warn('[secureWebhook] Invalid webhook secret attempt')
        return NextResponse.json(
          { error: 'invalid_secret' },
          { status: 403 }
        )
      }
      
      // Parse payload
      let payload: any
      try {
        payload = await req.json()
      } catch {
        return NextResponse.json(
          { error: 'invalid_json' },
          { status: 400 }
        )
      }
      
      return handler(req, payload)
    },
    {
      rateLimit: rateLimitConfig,
      requireAuth: false,
    }
  )
}

/**
 * Exemplo de uso completo:
 * 
 * // app/api/auth/login/route.ts
 * export const POST = secureRoute(
 *   async (req, session) => {
 *     const body = await req.json()
 *     // ... login logic
 *     return NextResponse.json({ success: true })
 *   },
 *   {
 *     rateLimit: rateLimitPresets.auth,
 *   }
 * )
 * 
 * // app/api/webhook/evolution/route.ts
 * export const POST = secureWebhook(
 *   async (req, payload) => {
 *     // Process webhook
 *     return NextResponse.json({ received: true })
 *   }
 * )
 */
